/*
 * MUNFMS - A dedicated file management tool for organizing and sharing documents in MUN meetings.
 * Copyright (C) 2026 iXiQiu (@ixiqiu)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity, SpaceType } from '../entities/file.entity';
import { User, UserRole } from '../entities/user.entity';
import { Message } from '../entities/message.entity';
import { EventsService } from '../events/events.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
  private readonly uploadBaseDir = path.join(process.cwd(), 'uploads');

  constructor(
    @InjectRepository(FileEntity)
    private fileRepo: Repository<FileEntity>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    private eventsService: EventsService,
  ) {
    // 确保上传目录存在
    this.ensureUploadDirs();
  }

  private ensureUploadDirs() {
    const dirs = [
      path.join(this.uploadBaseDir, 'cabinet'),
      path.join(this.uploadBaseDir, 'public'),
      path.join(this.uploadBaseDir, 'conference'),
      path.join(this.uploadBaseDir, 'temp'),
    ];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * 上传文件
   * @param file Multer 处理的文件
   * @param spaceType 空间类型
   * @param user 当前用户 (从 JWT 解析)
   */
  async uploadFile(
    file: Express.Multer.File,
    spaceType: SpaceType,
    user: { id: string; cabinetId: string; role: UserRole },
  ): Promise<FileEntity> {
    let targetId: string;
    let storageDir: string;

    // 根据空间类型确定存储路径和 targetId
    switch (spaceType) {
      case SpaceType.CABINET:
        targetId = user.cabinetId;
        storageDir = path.join(this.uploadBaseDir, 'cabinet', targetId);
        break;
      case SpaceType.PUBLIC:
        if (user.role !== UserRole.ACADEMIC) {
          throw new ForbiddenException('只有学术组成员可以上传公共空间文件');
        }
        targetId = 'PUBLIC';
        storageDir = path.join(this.uploadBaseDir, 'public');
        break;
      case SpaceType.CONFERENCE:
        targetId = 'CONFERENCE';
        storageDir = path.join(this.uploadBaseDir, 'conference');
        break;
      default:
        throw new BadRequestException('无效的空间类型');
    }

    // 确保目录存在
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    // 生成唯一文件名
    const uniqueFileName = `${uuidv4()}_${file.originalname}`;
    const storagePath = path.join(storageDir, uniqueFileName);
    // relativePath 必须与实际存储位置一致（cabinet 含 targetId 子目录，public/conference 直接存于空间目录）
    const relativePath =
      spaceType === SpaceType.CABINET
        ? path.join(spaceType.toLowerCase(), targetId, uniqueFileName)
        : path.join(spaceType.toLowerCase(), uniqueFileName);

    try {
      // 移动文件到目标位置 (diskStorage 已经保存了临时文件)
      await fs.promises.rename(file.path, storagePath);

      // 创建数据库记录
      const fileEntity = this.fileRepo.create({
        fileName: file.originalname,
        storagePath: relativePath,
        spaceType,
        uploaderId: user.id,
        targetId,
        isFromConference: false,
      });

      const savedFile = await this.fileRepo.save(fileEntity);
      this.eventsService.emit({
        type: 'file.changed',
        spaceType,
        targetId,
        actorId: user.id,
        ts: Date.now(),
      });
      return savedFile;
    } catch (error) {
      // 如果数据库保存失败，删除已上传的文件
      if (fs.existsSync(storagePath)) {
        await fs.promises.unlink(storagePath);
      }
      throw error;
    }
  }

  /**
   * 获取文件列表
   */
  async getFiles(
    spaceType: SpaceType,
    user: { id: string; cabinetId: string; role: UserRole },
    type?: string,
  ): Promise<FileEntity[]> {
    const query = this.fileRepo.createQueryBuilder('file');

    switch (spaceType) {
      case SpaceType.CABINET:
        // 内阁空间：只能查看本内阁的文件
        query.where('file.spaceType = :spaceType', { spaceType: SpaceType.CABINET })
             .andWhere('file.targetId = :targetId', { targetId: user.cabinetId });
        break;

      case SpaceType.PUBLIC:
        // 公共空间：所有人可读
        query.where('file.spaceType = :spaceType', { spaceType: SpaceType.PUBLIC });
        break;

      case SpaceType.CONFERENCE:
        // 会议空间
        if (type === 'MY') {
          // 代表只能查看自己的提交
          query.where('file.spaceType = :spaceType', { spaceType: SpaceType.CONFERENCE })
               .andWhere('file.uploaderId = :uploaderId', { uploaderId: user.id });
        } else if (user.role === UserRole.ACADEMIC) {
          // 学术组可以查看所有会议空间文件
          query.where('file.spaceType = :spaceType', { spaceType: SpaceType.CONFERENCE });
        } else {
          // 代表未指定 type 时，默认返回自己的提交
          query.where('file.spaceType = :spaceType', { spaceType: SpaceType.CONFERENCE })
               .andWhere('file.uploaderId = :uploaderId', { uploaderId: user.id });
        }
        break;
    }

    query.orderBy('file.createdAt', 'DESC');
    const files = await query.getMany();
    return this.attachUploaderNames(files);
  }

  private async attachUploaderNames(
    files: FileEntity[],
  ): Promise<(FileEntity & { uploaderName?: string; uploaderCabinetName?: string })[]> {
    const uploaderIds = [...new Set(files.map((f) => f.uploaderId))];
    if (uploaderIds.length === 0) {
      return files;
    }
    const users = await this.userRepo.find({
      where: uploaderIds.map((id) => ({ id })),
      relations: ['cabinet'],
    });
    const nameMap = new Map(users.map((u) => [u.id, u.name]));
    const cabinetMap = new Map(users.map((u) => [u.id, u.cabinet?.name]));
    return files.map((f) => ({
      ...f,
      uploaderName: nameMap.get(f.uploaderId),
      uploaderCabinetName: cabinetMap.get(f.uploaderId),
    }));
  }

  /**
   * 获取单个文件
   */
  async getFile(fileId: string, user: { id: string; cabinetId: string; role: UserRole }): Promise<FileEntity> {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    
    if (!file) {
      throw new NotFoundException('文件不存在');
    }

    // 磋商附件属于会话消息，只能通过会话下载接口访问，禁止经文件空间接口访问
    if (file.spaceType === SpaceType.CONSULT) {
      throw new ForbiddenException('磋商文件请通过会话消息下载');
    }

    // 权限校验
    if (file.spaceType === SpaceType.CABINET && file.targetId !== user.cabinetId) {
      throw new ForbiddenException('无权访问该内阁文件');
    }

    if (file.spaceType === SpaceType.CONFERENCE) {
      if (user.role !== UserRole.ACADEMIC && file.uploaderId !== user.id) {
        throw new ForbiddenException('无权访问该会议文件');
      }
    }

    return file;
  }

  /**
   * 下载文件流
   */
  async downloadFile(fileId: string, user: { id: string; cabinetId: string; role: UserRole }): Promise<{ readStream: fs.ReadStream; fileName: string }> {
    const file = await this.getFile(fileId, user);
    
    const fullPath = path.join(this.uploadBaseDir, file.storagePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('物理文件不存在');
    }

    const readStream = fs.createReadStream(fullPath);
    return { readStream, fileName: file.fileName };
  }

  /**
   * 一键复制：将会议空间文件发布到公共空间
   */
  async publishToPublic(fileId: string, user: { id: string; cabinetId: string; role: UserRole }): Promise<FileEntity> {
    if (user.role !== UserRole.ACADEMIC) {
      throw new ForbiddenException('只有学术组成员可以执行一键复制操作');
    }

    // 查找原文件
    const originalFile = await this.fileRepo.findOne({ where: { id: fileId } });
    
    if (!originalFile) {
      throw new NotFoundException('文件不存在');
    }

    if (originalFile.spaceType !== SpaceType.CONFERENCE) {
      throw new BadRequestException('只能复制会议空间的文件到公共空间');
    }

    // 复制物理文件
    const srcPath = path.join(this.uploadBaseDir, originalFile.storagePath);
    const destDir = path.join(this.uploadBaseDir, 'public');
    const uniqueFileName = `${uuidv4()}_${originalFile.fileName}`;
    const destPath = path.join(destDir, uniqueFileName);

    if (!fs.existsSync(srcPath)) {
      throw new NotFoundException('原文件不存在');
    }

    try {
      // 复制文件
      await fs.promises.copyFile(srcPath, destPath);

      // 创建新的数据库记录
      const newFile = this.fileRepo.create({
        fileName: originalFile.fileName,
        storagePath: path.join('public', uniqueFileName),
        spaceType: SpaceType.PUBLIC,
        uploaderId: user.id,
        targetId: 'PUBLIC',
        isFromConference: true,
      });

      const savedFile = await this.fileRepo.save(newFile);
      this.eventsService.emit({
        type: 'file.changed',
        spaceType: SpaceType.PUBLIC,
        targetId: 'PUBLIC',
        actorId: user.id,
        ts: Date.now(),
      });
      return savedFile;
    } catch (error) {
      // 如果失败，清理已复制的文件
      if (fs.existsSync(destPath)) {
        await fs.promises.unlink(destPath);
      }
      throw error;
    }
  }

  /**
   * 删除文件 (仅学术组可删除公共空间文件)
   */
  async deleteFile(fileId: string, user: { id: string; cabinetId: string; role: UserRole }): Promise<void> {
    const file = await this.getFile(fileId, user);

    // 权限校验
    if (file.spaceType === SpaceType.PUBLIC && user.role !== UserRole.ACADEMIC) {
      throw new ForbiddenException('只有学术组成员可以删除公共空间文件');
    }

    if (file.spaceType === SpaceType.CONFERENCE && user.role !== UserRole.ACADEMIC) {
      throw new ForbiddenException('只有学术组成员可以删除会议空间文件');
    }

    if (file.spaceType === SpaceType.CABINET) {
      // 内阁文件只能由本内阁成员删除（这里简化处理，实际可能需要更细粒度控制）
      if (file.targetId !== user.cabinetId) {
        throw new ForbiddenException('无权删除该内阁文件');
      }
    }

    // 删除物理文件
    const fullPath = path.join(this.uploadBaseDir, file.storagePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }

    // 删除数据库记录前，先解除磋商消息对该文件的引用
    // （messages.fileId 外键引用 files，置空后消息保留、文件记录可正常删除）
    await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ fileId: null })
      .where('fileId = :fileId', { fileId })
      .execute();

    // 删除数据库记录
    await this.fileRepo.delete(fileId);

    this.eventsService.emit({
      type: 'file.changed',
      spaceType: file.spaceType,
      targetId: file.targetId,
      actorId: user.id,
      ts: Date.now(),
    });
  }
}
