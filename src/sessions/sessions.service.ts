import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, In } from 'typeorm';
import { Session } from '../entities/session.entity';
import { Message } from '../entities/message.entity';
import { FileEntity } from '../entities/file.entity';
import { Cabinet } from '../entities/cabinet.entity';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SessionsService {
  private readonly uploadBaseDir = path.join(process.cwd(), 'uploads', 'consult');

  constructor(
    @InjectRepository(Session)
    private sessionRepo: Repository<Session>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(FileEntity)
    private fileRepo: Repository<FileEntity>,
    @InjectRepository(Cabinet)
    private cabinetRepo: Repository<Cabinet>,
  ) {
    this.ensureUploadDirs();
  }

  private ensureUploadDirs() {
    if (!fs.existsSync(this.uploadBaseDir)) {
      fs.mkdirSync(this.uploadBaseDir, { recursive: true });
    }
  }

  /**
   * 获取当前内阁的所有磋商会话列表（含未读数）
   */
  async getSessions(cabinetId: string): Promise<any[]> {
    const sessions = await this.sessionRepo.find({
      where: [
        { cabinetA_id: cabinetId },
        { cabinetB_id: cabinetId },
      ],
      order: { lastMessageTime: 'DESC' },
    });

    const result = [];
    for (const session of sessions) {
      // 计算未读数：发送方不是自己且未读的消息数量
      const unreadCount = await this.messageRepo.count({
        where: {
          sessionId: session.id,
          isRead: false,
          senderCabinetId: Brackets(qb => qb.where('senderCabinetId != :cabinetId', { cabinetId })),
        },
      });

      // 获取对方内阁信息
      const otherCabinetId = session.cabinetA_id === cabinetId ? session.cabinetB_id : session.cabinetA_id;
      const otherCabinet = await this.cabinetRepo.findOne({ where: { id: otherCabinetId } });

      result.push({
        ...session,
        otherCabinet: otherCabinet || { id: otherCabinetId, name: '未知内阁' },
        unreadCount,
      });
    }

    return result;
  }

  /**
   * 获取或创建会话
   */
  async getOrCreateSession(cabinetA_id: string, cabinetB_id: string): Promise<Session> {
    // 确保 cabinetA_id < cabinetB_id 以保证唯一性
    const [first, second] = [cabinetA_id, cabinetB_id].sort();

    let session = await this.sessionRepo.findOne({
      where: {
        cabinetA_id: first,
        cabinetB_id: second,
      },
    });

    if (!session) {
      session = this.sessionRepo.create({
        cabinetA_id: first,
        cabinetB_id: second,
        lastMessageTime: null,
      });
      session = await this.sessionRepo.save(session);
    }

    return session;
  }

  /**
   * 获取会话消息历史
   */
  async getMessages(sessionId: string, cabinetId: string): Promise<any[]> {
    // 校验权限：当前内阁必须是会话参与方
    const session = await this.sessionRepo.findOne({
      where: [
        { id: sessionId, cabinetA_id: cabinetId },
        { id: sessionId, cabinetB_id: cabinetId },
      ],
    });

    if (!session) {
      throw new ForbiddenException('无权访问该会话');
    }

    const messages = await this.messageRepo.find({
      where: { sessionId },
      relations: ['file'],
      order: { createdAt: 'ASC' },
    });

    // 标记所有消息为已读（除了自己发送的）
    const messagesToUpdate = messages.filter(m => m.senderCabinetId !== cabinetId && !m.isRead);
    if (messagesToUpdate.length > 0) {
      await this.messageRepo.update(
        { id: In(messagesToUpdate.map(m => m.id)) },
        { isRead: true },
      );
    }

    return messages;
  }

  /**
   * 发送磋商文件消息
   */
  async sendMessage(
    sessionId: string,
    file: Express.Multer.File,
    senderCabinetId: string,
    uploaderId: string,
  ): Promise<Message> {
    // 校验会话存在且用户有权限
    const session = await this.sessionRepo.findOne({
      where: [
        { id: sessionId, cabinetA_id: senderCabinetId },
        { id: sessionId, cabinetB_id: senderCabinetId },
      ],
    });

    if (!session) {
      throw new ForbiddenException('无权向该会话发送消息');
    }

    // 确保上传目录存在
    const storageDir = this.uploadBaseDir;
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    // 生成唯一文件名
    const uniqueFileName = `${uuidv4()}_${file.originalname}`;
    const storagePath = path.join(storageDir, uniqueFileName);
    const relativePath = path.join('consult', uniqueFileName);

    try {
      // 移动文件
      await fs.promises.rename(file.path, storagePath);

      // 创建文件记录
      const fileEntity = this.fileRepo.create({
        fileName: file.originalname,
        storagePath: relativePath,
        spaceType: 'CABINET' as any, // 磋商文件归类为 CABINET 类型
        uploaderId,
        targetId: senderCabinetId,
        isFromConference: false,
      });
      const savedFile = await this.fileRepo.save(fileEntity);

      // 创建消息记录
      const message = this.messageRepo.create({
        sessionId,
        senderCabinetId,
        fileId: savedFile.id,
        isRead: false,
      });
      const savedMessage = await this.messageRepo.save(message);

      // 更新会话最后消息时间
      session.lastMessageTime = new Date();
      await this.sessionRepo.save(session);

      return savedMessage;
    } catch (error) {
      // 清理文件
      if (fs.existsSync(storagePath)) {
        await fs.promises.unlink(storagePath);
      }
      throw error;
    }
  }

  /**
   * 下载磋商文件
   */
  async downloadFile(messageId: string, cabinetId: string): Promise<{ readStream: fs.ReadStream; fileName: string }> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ['file'],
    });

    if (!message) {
      throw new NotFoundException('消息不存在');
    }

    // 校验权限：通过 session 验证
    const session = await this.sessionRepo.findOne({
      where: [
        { id: message.sessionId, cabinetA_id: cabinetId },
        { id: message.sessionId, cabinetB_id: cabinetId },
      ],
    });

    if (!session) {
      throw new ForbiddenException('无权访问该文件');
    }

    const fullPath = path.join(this.uploadBaseDir, '..', '..', message.file.storagePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('物理文件不存在');
    }

    const readStream = fs.createReadStream(fullPath);
    return { readStream, fileName: message.file.fileName };
  }
}
