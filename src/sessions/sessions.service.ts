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
import { Repository, Not, In } from 'typeorm';
import { Session } from '../entities/session.entity';
import { SessionMember } from '../entities/session-member.entity';
import { Message, MessageSenderType } from '../entities/message.entity';
import { FileEntity, SpaceType } from '../entities/file.entity';
import { Cabinet } from '../entities/cabinet.entity';
import { User, UserRole } from '../entities/user.entity';
import { EventsService } from '../events/events.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SessionsService {
  private readonly uploadBaseDir = path.join(process.cwd(), 'uploads', 'consult');

  constructor(
    @InjectRepository(Session)
    private sessionRepo: Repository<Session>,
    @InjectRepository(SessionMember)
    private sessionMemberRepo: Repository<SessionMember>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(FileEntity)
    private fileRepo: Repository<FileEntity>,
    @InjectRepository(Cabinet)
    private cabinetRepo: Repository<Cabinet>,
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

  private async isMember(sessionId: string, cabinetId: string): Promise<boolean> {
    const member = await this.sessionMemberRepo.findOne({
      where: { sessionId, cabinetId },
    });
    return !!member;
  }

  /**
   * 学术组与管理员拥有全部群聊的访问与管理权限
   */
  private hasFullSessionAccess(role: UserRole): boolean {
    return role === UserRole.ACADEMIC || role === UserRole.ADMIN;
  }

  async migrateLegacySessions() {
    const legacySessions = await this.sessionRepo
      .createQueryBuilder('s')
      .where('s.cabinetA_id IS NOT NULL')
      .getMany();
    for (const session of legacySessions) {
      const memberCount = await this.sessionMemberRepo.count({
        where: { sessionId: session.id },
      });
      if (memberCount > 0) {
        continue;
      }
      const ids = [session.cabinetA_id, session.cabinetB_id].filter((id): id is string => !!id);
      if (ids.length > 0) {
        await this.sessionMemberRepo.save(
          ids.map((cabinetId) => ({ sessionId: session.id, cabinetId })),
        );
      }
    }
  }

  async createGroupSession(
    cabinetIds: string[],
    name: string | undefined,
    creatorCabinetId: string,
  ): Promise<Session> {
    const uniqueIds = [...new Set([...cabinetIds, creatorCabinetId])];
    if (uniqueIds.length < 2) {
      throw new BadRequestException('群聊至少需要 2 个内阁');
    }
    const cabinets = await this.cabinetRepo.find({
      where: uniqueIds.map((id) => ({ id })),
    });
    if (cabinets.length !== uniqueIds.length) {
      throw new BadRequestException('存在无效的内阁');
    }

    const sortedIds = [...uniqueIds].sort();
    const firstCabinetId = sortedIds[0];
    const candidates = await this.sessionMemberRepo.find({
      where: { cabinetId: firstCabinetId },
    });
    for (const candidate of candidates) {
      const members = await this.sessionMemberRepo.find({
        where: { sessionId: candidate.sessionId },
      });
      const memberIds = members.map((m) => m.cabinetId).sort();
      if (
        memberIds.length === sortedIds.length &&
        memberIds.every((id, i) => id === sortedIds[i])
      ) {
        return this.sessionRepo.findOne({ where: { id: candidate.sessionId } });
      }
    }

    const session = await this.sessionRepo.save(
      this.sessionRepo.create({
        name: name || cabinets.map((c) => c.name).join(' · '),
        lastMessageTime: null,
      }),
    );
    await this.sessionMemberRepo.save(
      uniqueIds.map((cabinetId) => ({ sessionId: session.id, cabinetId })),
    );
    this.eventsService.emit({ type: 'session.changed', ts: Date.now() });
    return session;
  }

  async renameSession(
    sessionId: string,
    name: string,
    cabinetId: string,
    role: UserRole,
  ): Promise<Session> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('群聊不存在');
    }
    if (!this.hasFullSessionAccess(role) && !(await this.isMember(sessionId, cabinetId))) {
      throw new ForbiddenException('无权操作该群聊');
    }
    session.name = name;
    const savedSession = await this.sessionRepo.save(session);
    this.eventsService.emit({ type: 'session.changed', ts: Date.now() });
    return savedSession;
  }

  /**
   * 学术组解散群聊：删除群聊及其全部消息、消息文件（含物理文件）与成员关系
   */
  async dissolveSession(sessionId: string, role: UserRole): Promise<void> {
    if (!this.hasFullSessionAccess(role)) {
      throw new ForbiddenException('只有学术组可以解散群聊，代表请使用退出群聊');
    }
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('群聊不存在');
    }
    await this.deleteSessionContent(sessionId);
    this.eventsService.emit({ type: 'session.changed', ts: Date.now() });
  }

  /**
   * 代表退出群聊：仅移除自己的成员关系；
   * 群聊及其中文件保留，由学术组审议后决定是否解散
   */
  async leaveSession(sessionId: string, cabinetId: string): Promise<void> {
    if (!(await this.isMember(sessionId, cabinetId))) {
      throw new ForbiddenException('你不在该群聊中');
    }
    await this.sessionMemberRepo.delete({ sessionId, cabinetId });
    this.eventsService.emit({ type: 'session.changed', ts: Date.now() });
  }

  /**
   * 级联删除群聊内容（文件/消息/成员关系/群聊本身）
   */
  private async deleteSessionContent(sessionId: string): Promise<void> {
    const messages = await this.messageRepo.find({ where: { sessionId } });
    const messageFileIds = messages.map((m) => m.fileId).filter((id): id is string => !!id);

    // 先删消息（messages.fileId 外键引用 files），再删文件记录
    await this.messageRepo.delete({ sessionId });

    if (messageFileIds.length > 0) {
      const files = await this.fileRepo.find({
        where: messageFileIds.map((id) => ({ id })),
      });
      for (const file of files) {
        const fullPath = path.join(process.cwd(), 'uploads', file.storagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
      await this.fileRepo.delete(messageFileIds.map((id) => ({ id })));
    }

    await this.sessionMemberRepo.delete({ sessionId });
    await this.sessionRepo.delete({ id: sessionId });
  }

  async getSessions(cabinetId: string, role: UserRole): Promise<any[]> {
    let sessions: Session[];
    if (this.hasFullSessionAccess(role)) {
      sessions = await this.sessionRepo.find({
        order: { lastMessageTime: 'DESC' },
      });
    } else {
      const memberships = await this.sessionMemberRepo.find({
        where: { cabinetId },
      });
      if (memberships.length === 0) {
        return [];
      }
      sessions = await this.sessionRepo.find({
        where: memberships.map((m) => ({ id: m.sessionId })),
        order: { lastMessageTime: 'DESC' },
      });
    }

    const result = [];
    for (const session of sessions) {
      const unreadCount = await this.countUnread(session.id, cabinetId, role);
      const members = await this.sessionMemberRepo.find({
        where: { sessionId: session.id },
      });
      const cabinets = await this.cabinetRepo.find({
        where: members.map((m) => ({ id: m.cabinetId })),
      });
      result.push({
        id: session.id,
        name: session.name,
        lastMessageTime: session.lastMessageTime,
        members: cabinets.map((c) => ({ id: c.id, name: c.name, type: c.type })),
        unreadCount,
      });
    }
    return result;
  }

  private async countUnread(
    sessionId: string,
    cabinetId: string,
    role: UserRole,
  ): Promise<number> {
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .where('m.sessionId = :sessionId', { sessionId })
      .andWhere('m.isRead = 0');
    if (this.hasFullSessionAccess(role)) {
      qb.andWhere("m.senderType != 'ACADEMIC'");
    } else {
      qb.andWhere(
        "NOT (m.senderType = 'CABINET' AND m.senderCabinetId = :cabinetId)",
        { cabinetId },
      );
    }
    return qb.getCount();
  }

  async getMessages(
    sessionId: string,
    cabinetId: string,
    role: UserRole,
  ): Promise<any[]> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('群聊不存在');
    }
    if (!this.hasFullSessionAccess(role) && !(await this.isMember(sessionId, cabinetId))) {
      throw new ForbiddenException('无权访问该群聊');
    }

    const messages = await this.messageRepo.find({
      where: { sessionId },
      relations: ['file'],
      order: { createdAt: 'ASC' },
    });

    const messagesToUpdate = messages.filter((m) => {
      if (m.isRead) {
        return false;
      }
      if (this.hasFullSessionAccess(role)) {
        return m.senderType !== MessageSenderType.ACADEMIC;
      }
      return !(
        m.senderType === MessageSenderType.CABINET &&
        m.senderCabinetId === cabinetId
      );
    });
    if (messagesToUpdate.length > 0) {
      await this.messageRepo.update(
        { id: In(messagesToUpdate.map((m) => m.id)) },
        { isRead: true },
      );
    }

    const senderIds = messages
      .filter((m) => m.senderCabinetId)
      .map((m) => m.senderCabinetId);
    const senders = senderIds.length
      ? await this.cabinetRepo.find({
          where: [...new Set(senderIds)].map((id) => ({ id })),
        })
      : [];
    const senderNameMap = new Map(senders.map((c) => [c.id, c.name]));

    const academicUploaderIds = messages
      .filter((m) => m.senderType === MessageSenderType.ACADEMIC)
      .map((m) => m.file?.uploaderId);
    const academicUsers = academicUploaderIds.length
      ? await this.userRepo.find({
          where: [...new Set(academicUploaderIds)].map((id) => ({ id })),
          relations: ['cabinet'],
        })
      : [];
    const academicNameMap = new Map(
      academicUsers.map((u) => [u.id, u.cabinet?.name]),
    );

    // 发送人信息富化：收集全部发送人用户 ID（ACADEMIC 消息 senderUserId 一定存在；
    // 老数据兜底到 file.uploaderId），一次查询建 Map，避免 N+1
    const uploaderIds = messages
      .map((m) => m.senderUserId ?? m.file?.uploaderId)
      .filter((id): id is string => !!id);
    const uploaderUsers = uploaderIds.length
      ? await this.userRepo.find({
          where: [...new Set(uploaderIds)].map((id) => ({ id })),
          relations: ['cabinet'],
        })
      : [];
    const uploaderNameMap = new Map(uploaderUsers.map((u) => [u.id, u.name]));
    const uploaderCabinetNameMap = new Map(
      uploaderUsers.map((u) => [u.id, u.cabinet?.name ?? null]),
    );

    return messages.map((m) => {
      const uploaderId = m.senderUserId ?? m.file?.uploaderId ?? null;
      return {
        ...m,
        senderName:
          m.senderType === MessageSenderType.ACADEMIC
            ? academicNameMap.get(m.file?.uploaderId) || '学团'
            : senderNameMap.get(m.senderCabinetId) || '未知',
        uploaderName: uploaderId ? uploaderNameMap.get(uploaderId) ?? null : null,
        uploaderCabinetName: uploaderId
          ? uploaderCabinetNameMap.get(uploaderId) ?? null
          : null,
      };
    });
  }

  async sendMessage(
    sessionId: string,
    file: Express.Multer.File | null,
    content: string | null,
    senderCabinetId: string | null,
    senderType: MessageSenderType,
    uploaderId: string,
    senderUserId: string,
    role: UserRole,
  ): Promise<Message> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('群聊不存在');
    }
    if (
      !this.hasFullSessionAccess(role) &&
      !(await this.isMember(sessionId, senderCabinetId))
    ) {
      throw new ForbiddenException('无权向该群聊发送消息');
    }

    const storageDir = this.uploadBaseDir;
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    let storagePath: string | null = null;

    try {
      let fileId: string | null = null;
      if (file) {
        const uniqueFileName = `${uuidv4()}_${file.originalname}`;
        storagePath = path.join(storageDir, uniqueFileName);
        const relativePath = path.join('consult', uniqueFileName);

        await fs.promises.rename(file.path, storagePath);

        const fileEntity = this.fileRepo.create({
          fileName: file.originalname,
          storagePath: relativePath,
          spaceType: SpaceType.CONSULT,
          uploaderId,
          targetId: null,
          isFromConference: false,
        });
        const savedFile = await this.fileRepo.save(fileEntity);
        fileId = savedFile.id;
      }

      const message = this.messageRepo.create({
        sessionId,
        senderCabinetId,
        senderType,
        fileId,
        content,
        senderUserId,
        isRead: false,
      });
      const savedMessage = await this.messageRepo.save(message);

      session.lastMessageTime = new Date();
      await this.sessionRepo.save(session);

      this.eventsService.emit({
        type: 'message.new',
        sessionId,
        actorId: uploaderId,
        senderCabinetId: senderCabinetId ?? null,
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
   * 从内阁复制文件到群聊（物理复制，等效下载再上传，独立文件记录）
   */
  async copyFromCabinet(
    sessionId: string,
    fileId: string,
    user: { id: string; cabinetId: string; role: UserRole },
  ): Promise<Message> {
    if (user.role !== UserRole.DELEGATE || !user.cabinetId) {
      throw new BadRequestException('只有代表可以复制内阁文件');
    }

    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('群聊不存在');
    }
    if (!(await this.isMember(sessionId, user.cabinetId))) {
      throw new ForbiddenException('无权向该群聊发送消息');
    }

    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('文件不存在');
    }
    if (file.spaceType !== SpaceType.CABINET || file.targetId !== user.cabinetId) {
      throw new ForbiddenException('只能复制本内阁的文件');
    }

    const srcPath = path.join(process.cwd(), 'uploads', file.storagePath);
    if (!fs.existsSync(srcPath)) {
      throw new NotFoundException('原文件不存在');
    }

    const destDir = path.join(process.cwd(), 'uploads', 'consult');
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const uniqueFileName = `${uuidv4()}_${file.fileName}`;
    const destPath = path.join(destDir, uniqueFileName);

    try {
      await fs.promises.copyFile(srcPath, destPath);

      const fileEntity = this.fileRepo.create({
        fileName: file.fileName,
        storagePath: path.join('consult', uniqueFileName),
        spaceType: SpaceType.CONSULT,
        uploaderId: user.id,
        targetId: null,
        isFromConference: false,
      });
      const savedFile = await this.fileRepo.save(fileEntity);

      const message = this.messageRepo.create({
        sessionId,
        senderCabinetId: user.cabinetId,
        senderType: MessageSenderType.CABINET,
        fileId: savedFile.id,
        content: null,
        senderUserId: user.id,
        isRead: false,
      });
      const savedMessage = await this.messageRepo.save(message);

      session.lastMessageTime = new Date();
      await this.sessionRepo.save(session);

      this.eventsService.emit({
        type: 'message.new',
        sessionId,
        actorId: user.id,
        senderCabinetId: user.cabinetId,
        ts: Date.now(),
      });

      return savedMessage;
    } catch (error) {
      if (fs.existsSync(destPath)) {
        await fs.promises.unlink(destPath);
      }
      throw error;
    }
  }

  async downloadFile(
    messageId: string,
    cabinetId: string,
    role: UserRole,
  ): Promise<{ readStream: fs.ReadStream; fileName: string; mimeType: string }> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ['file'],
    });

    if (!message) {
      throw new NotFoundException('消息不存在');
    }

    if (
      !this.hasFullSessionAccess(role) &&
      !(await this.isMember(message.sessionId, cabinetId))
    ) {
      throw new ForbiddenException('无权访问该文件');
    }

    if (!message.file) {
      throw new NotFoundException('消息没有附件');
    }

    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/msword',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.ms-excel',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.ms-powerpoint',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
    };

    const fullPath = path.join(process.cwd(), 'uploads', message.file.storagePath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('物理文件不存在');
    }

    const ext = path.extname(message.file.fileName).toLowerCase();
    const mimeType = mimeTypes[ext] ?? 'application/octet-stream';

    const readStream = fs.createReadStream(fullPath);
    return { readStream, fileName: message.file.fileName, mimeType };
  }
}
