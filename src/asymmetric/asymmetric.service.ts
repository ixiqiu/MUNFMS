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

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AsymMessage } from '../entities/asym-message.entity';
import { MessageSenderType } from '../entities/message.entity';
import { FileEntity, SpaceType } from '../entities/file.entity';
import { Cabinet } from '../entities/cabinet.entity';
import { User, UserRole } from '../entities/user.entity';
import { EventsService } from '../events/events.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AsymmetricService {
  private readonly uploadBaseDir = path.join(process.cwd(), 'uploads', 'asymmetric');

  constructor(
    @InjectRepository(AsymMessage)
    private asymRepo: Repository<AsymMessage>,
    @InjectRepository(Cabinet)
    private cabinetRepo: Repository<Cabinet>,
    @InjectRepository(FileEntity)
    private fileRepo: Repository<FileEntity>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private eventsService: EventsService,
  ) {
    this.ensureUploadDirs();
  }

  private ensureUploadDirs() {
    if (!fs.existsSync(this.uploadBaseDir)) {
      fs.mkdirSync(this.uploadBaseDir, { recursive: true });
    }
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  }

  /**
   * 频道列表：ACADEMIC 见全部内阁（按名称升序），DELEGATE 仅本内阁单通道
   */
  async channels(user: { id: string; cabinetId: string; role: UserRole }) {
    if (user.role === UserRole.ACADEMIC) {
      const cabinets = await this.cabinetRepo.find({ order: { name: 'ASC' } });
      return Promise.all(
        cabinets.map((c) => this.buildChannel(c.id, c.name, true)),
      );
    }
    if (!user.cabinetId) {
      return [];
    }
    const cabinet = await this.cabinetRepo.findOne({ where: { id: user.cabinetId } });
    if (!cabinet) {
      return [];
    }
    return [await this.buildChannel(cabinet.id, cabinet.name, false)];
  }

  /**
   * 单个频道：最近一条消息时间 + 未读数（未读 = 对方侧消息且 isRead=false）
   */
  private async buildChannel(
    cabinetId: string,
    cabinetName: string,
    readerIsAcademic: boolean,
  ) {
    const lastMessage = await this.asymRepo.findOne({
      where: { cabinetId },
      order: { createdAt: 'DESC' },
    });
    const unreadCount = await this.asymRepo.count({
      where: {
        cabinetId,
        isRead: false,
        senderType: readerIsAcademic
          ? MessageSenderType.CABINET
          : MessageSenderType.ACADEMIC,
      },
    });
    return {
      cabinetId,
      cabinetName,
      lastMessageAt: lastMessage ? lastMessage.createdAt.toISOString() : null,
      unreadCount,
    };
  }

  /**
   * 消息列表：DELEGATE 强制本内阁；ACADEMIC 可指定任意内阁。
   * 取出后顺手把「对方侧」消息置为已读，再返回富化字段（文件名/发送人/内阁名）。
   */
  async messages(
    user: { id: string; cabinetId: string; role: UserRole },
    cabinetId?: string,
  ) {
    const isAcademic = user.role === UserRole.ACADEMIC;
    let targetCabinetId: string;
    if (isAcademic) {
      if (!cabinetId) {
        throw new BadRequestException('缺少内阁参数');
      }
      const cabinet = await this.cabinetRepo.findOne({ where: { id: cabinetId } });
      if (!cabinet) {
        throw new NotFoundException('内阁不存在');
      }
      targetCabinetId = cabinetId;
    } else {
      if (cabinetId && cabinetId !== user.cabinetId) {
        throw new ForbiddenException('无权查看其他内阁的会话');
      }
      if (!user.cabinetId) {
        throw new BadRequestException('当前账号未绑定内阁');
      }
      targetCabinetId = user.cabinetId;
    }

    const messages = await this.asymRepo.find({
      where: { cabinetId: targetCabinetId },
      order: { createdAt: 'ASC' },
    });

    // 读取后置已读：读方为 ACADEMIC 时置 CABINET 侧，读方为 DELEGATE 时置 ACADEMIC 侧
    const oppositeType = isAcademic
      ? MessageSenderType.CABINET
      : MessageSenderType.ACADEMIC;
    const unreadIds = messages
      .filter((m) => !m.isRead && m.senderType === oppositeType)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      await this.asymRepo.update({ id: In(unreadIds) }, { isRead: true });
    }

    // 附件文件名（AsymMessage 无关联关系，单独查询建 Map，避免 N+1）
    const fileIds = messages
      .map((m) => m.fileId)
      .filter((id): id is string => !!id);
    const files = fileIds.length
      ? await this.fileRepo.find({ where: fileIds.map((id) => ({ id })) })
      : [];
    const fileMap = new Map(files.map((f) => [f.id, f]));

    // 发送人用户名 + 所属内阁名
    const senderIds = messages
      .map((m) => m.senderUserId)
      .filter((id): id is string => !!id);
    const senders = senderIds.length
      ? await this.userRepo.find({
          where: [...new Set(senderIds)].map((id) => ({ id })),
          relations: ['cabinet'],
        })
      : [];
    const senderNameMap = new Map(senders.map((u) => [u.id, u.name]));
    const senderCabinetMap = new Map(
      senders.map((u) => [u.id, u.cabinet?.name ?? null]),
    );

    // 兜底：DELEGATE 发送方的内阁名（同内阁成员共享通道）
    const channelCabinet = await this.cabinetRepo.findOne({
      where: { id: targetCabinetId },
    });
    const channelCabinetName = channelCabinet?.name ?? null;

    return messages.map((m) => ({
      ...m,
      file: m.fileId
        ? { id: m.fileId, fileName: fileMap.get(m.fileId)?.fileName ?? null }
        : null,
      senderName: m.senderUserId ? senderNameMap.get(m.senderUserId) ?? null : null,
      senderCabinetName:
        m.senderType === MessageSenderType.ACADEMIC
          ? '学术'
          : senderCabinetMap.get(m.senderUserId) ?? channelCabinetName,
    }));
  }

  /**
   * 发送消息：DELEGATE 强制本内阁；ACADEMIC 指定内阁；
   * 文字与附件至少其一；附件落地 uploads/asymmetric/（SpaceType=ASYMMETRIC）。
   */
  async send(
    user: { id: string; cabinetId: string; role: UserRole },
    body: { cabinetId?: string; content?: string },
    file: Express.Multer.File | null,
  ): Promise<AsymMessage> {
    if (!file && !body.content?.trim()) {
      throw new BadRequestException('内容与附件至少填写一项');
    }

    let targetCabinetId: string;
    if (user.role === UserRole.ACADEMIC) {
      if (!body.cabinetId) {
        throw new BadRequestException('缺少内阁参数');
      }
      const cabinet = await this.cabinetRepo.findOne({ where: { id: body.cabinetId } });
      if (!cabinet) {
        throw new NotFoundException('内阁不存在');
      }
      targetCabinetId = body.cabinetId;
    } else {
      if (!user.cabinetId) {
        throw new BadRequestException('当前账号未绑定内阁');
      }
      targetCabinetId = user.cabinetId;
    }

    const senderType =
      user.role === UserRole.ACADEMIC
        ? MessageSenderType.ACADEMIC
        : MessageSenderType.CABINET;

    if (!fs.existsSync(this.uploadBaseDir)) {
      fs.mkdirSync(this.uploadBaseDir, { recursive: true });
    }

    let storagePath: string | null = null;

    try {
      let fileId: string | null = null;
      if (file) {
        const uniqueFileName = `${uuidv4()}_${file.originalname}`;
        storagePath = path.join(this.uploadBaseDir, uniqueFileName);
        const relativePath = path.join('asymmetric', uniqueFileName);

        await fs.promises.rename(file.path, storagePath);

        const fileEntity = this.fileRepo.create({
          fileName: file.originalname,
          storagePath: relativePath,
          spaceType: SpaceType.ASYMMETRIC,
          uploaderId: user.id,
          targetId: null,
          isFromConference: false,
        });
        const savedFile = await this.fileRepo.save(fileEntity);
        fileId = savedFile.id;
      }

      const message = this.asymRepo.create({
        cabinetId: targetCabinetId,
        senderType,
        senderUserId: user.id,
        content: body.content?.trim() || null,
        fileId,
        isRead: false,
      });
      const savedMessage = await this.asymRepo.save(message);

      this.eventsService.emit({
        type: 'asym.message.new',
        targetId: targetCabinetId,
        senderType,
        actorId: user.id,
        ts: Date.now(),
      });

      return savedMessage;
    } catch (error) {
      if (storagePath && fs.existsSync(storagePath)) {
        await fs.promises.unlink(storagePath);
      }
      throw error;
    }
  }

  /**
   * 附件下载：权限 = 学术组，或该消息对应内阁成员
   */
  async download(id: string, user: { id: string; cabinetId: string; role: UserRole }) {
    const message = await this.asymRepo.findOne({ where: { id } });
    if (!message) {
      throw new NotFoundException('消息不存在');
    }

    if (user.role !== UserRole.ACADEMIC && message.cabinetId !== user.cabinetId) {
      throw new ForbiddenException('无权访问该文件');
    }

    if (!message.fileId) {
      throw new NotFoundException('消息没有附件');
    }

    const file = await this.fileRepo.findOne({ where: { id: message.fileId } });
    if (!file) {
      throw new NotFoundException('文件不存在');
    }

    const fullPath = path.join(process.cwd(), 'uploads', file.storagePath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('物理文件不存在');
    }

    return { readStream: fs.createReadStream(fullPath), fileName: file.fileName };
  }
}
