import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Session } from '../entities/session.entity';
import { SessionMember } from '../entities/session-member.entity';
import { Message, MessageSenderType } from '../entities/message.entity';
import { FileEntity, SpaceType } from '../entities/file.entity';
import { Cabinet } from '../entities/cabinet.entity';
import { User, UserRole } from '../entities/user.entity';
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

  private isAcademic(role: UserRole): boolean {
    return role === UserRole.ACADEMIC;
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
    if (!this.isAcademic(role) && !(await this.isMember(sessionId, cabinetId))) {
      throw new ForbiddenException('无权操作该群聊');
    }
    session.name = name;
    return this.sessionRepo.save(session);
  }

  async getSessions(cabinetId: string, role: UserRole): Promise<any[]> {
    let sessions: Session[];
    if (this.isAcademic(role)) {
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
    if (this.isAcademic(role)) {
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
    if (!this.isAcademic(role) && !(await this.isMember(sessionId, cabinetId))) {
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
      if (this.isAcademic(role)) {
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

    return messages.map((m) => ({
      ...m,
      senderName:
        m.senderType === MessageSenderType.ACADEMIC
          ? academicNameMap.get(m.file?.uploaderId) || '学团'
          : senderNameMap.get(m.senderCabinetId) || '未知',
    }));
  }

  async sendMessage(
    sessionId: string,
    file: Express.Multer.File,
    senderCabinetId: string | null,
    senderType: MessageSenderType,
    uploaderId: string,
    role: UserRole,
  ): Promise<Message> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('群聊不存在');
    }
    if (
      !this.isAcademic(role) &&
      !(await this.isMember(sessionId, senderCabinetId))
    ) {
      throw new ForbiddenException('无权向该群聊发送消息');
    }

    const storageDir = this.uploadBaseDir;
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const uniqueFileName = `${uuidv4()}_${file.originalname}`;
    const storagePath = path.join(storageDir, uniqueFileName);
    const relativePath = path.join('consult', uniqueFileName);

    try {
      await fs.promises.rename(file.path, storagePath);

      const fileEntity = this.fileRepo.create({
        fileName: file.originalname,
        storagePath: relativePath,
        spaceType: SpaceType.CABINET,
        uploaderId,
        targetId: senderType === MessageSenderType.ACADEMIC ? null : senderCabinetId,
        isFromConference: false,
      });
      const savedFile = await this.fileRepo.save(fileEntity);

      const message = this.messageRepo.create({
        sessionId,
        senderCabinetId,
        senderType,
        fileId: savedFile.id,
        isRead: false,
      });
      const savedMessage = await this.messageRepo.save(message);

      session.lastMessageTime = new Date();
      await this.sessionRepo.save(session);

      return savedMessage;
    } catch (error) {
      if (fs.existsSync(storagePath)) {
        await fs.promises.unlink(storagePath);
      }
      throw error;
    }
  }

  async downloadFile(
    messageId: string,
    cabinetId: string,
    role: UserRole,
  ): Promise<{ readStream: fs.ReadStream; fileName: string }> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ['file'],
    });

    if (!message) {
      throw new NotFoundException('消息不存在');
    }

    if (
      !this.isAcademic(role) &&
      !(await this.isMember(message.sessionId, cabinetId))
    ) {
      throw new ForbiddenException('无权访问该文件');
    }

    const fullPath = path.join(process.cwd(), 'uploads', message.file.storagePath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('物理文件不存在');
    }

    const readStream = fs.createReadStream(fullPath);
    return { readStream, fileName: message.file.fileName };
  }
}
