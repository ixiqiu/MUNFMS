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
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { User, UserRole } from '../entities/user.entity';
import { Cabinet, CabinetType } from '../entities/cabinet.entity';
import { FileEntity } from '../entities/file.entity';
import { Session } from '../entities/session.entity';
import { SessionMember } from '../entities/session-member.entity';
import { Message } from '../entities/message.entity';
import { EventsService } from '../events/events.service';

@Injectable()
export class AdminService {
  private readonly uploadBaseDir = path.join(process.cwd(), 'uploads');

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Cabinet)
    private cabinetRepo: Repository<Cabinet>,
    @InjectRepository(FileEntity)
    private fileRepo: Repository<FileEntity>,
    @InjectRepository(Session)
    private sessionRepo: Repository<Session>,
    @InjectRepository(SessionMember)
    private sessionMemberRepo: Repository<SessionMember>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    private eventsService: EventsService,
  ) {}

  async seedAdmin() {
    const existing = await this.userRepo.findOne({ where: { role: UserRole.ADMIN } });
    if (existing) {
      return null;
    }
    const passwordHash = await bcrypt.hash('admin123', 10);
    const admin = this.userRepo.create({
      name: 'admin',
      passwordHash,
      role: UserRole.ADMIN,
      cabinet: null,
      cabinetId: null,
    });
    return this.userRepo.save(admin);
  }

  async listUsers() {
    const users = await this.userRepo.find({
      relations: ['cabinet'],
      order: { createdAt: 'DESC' },
    });
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      cabinetId: u.cabinetId,
      cabinet: u.cabinet
        ? { id: u.cabinet.id, name: u.cabinet.name, type: u.cabinet.type }
        : null,
      createdAt: u.createdAt,
    }));
  }

  async createUser(payload: {
    name: string;
    password: string;
    role: UserRole;
    cabinetId?: string;
  }) {
    if (payload.role === UserRole.ADMIN) {
      throw new BadRequestException('请直接使用系统引导创建管理员');
    }
    if (!Object.values(UserRole).includes(payload.role)) {
      throw new BadRequestException('无效的用户角色');
    }
    const existing = await this.userRepo.findOne({ where: { name: payload.name } });
    if (existing) {
      throw new BadRequestException('用户名已存在');
    }
    let cabinet: Cabinet | null = null;
    if (payload.cabinetId) {
      cabinet = await this.cabinetRepo.findOne({ where: { id: payload.cabinetId } });
      if (!cabinet) {
        throw new BadRequestException('所选内阁不存在');
      }
    }
    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = this.userRepo.create({
      name: payload.name,
      passwordHash,
      role: payload.role,
      cabinet,
      cabinetId: cabinet?.id ?? null,
    });
    const saved = await this.userRepo.save(user);
    const { passwordHash: _passwordHash, ...safeUser } = saved;
    return safeUser;
  }

  async changePassword(userId: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);
  }

  async deleteUser(userId: string, operatorId: string) {
    if (userId === operatorId) {
      throw new BadRequestException('不能删除当前登录的账户');
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('不能删除管理员账户');
    }
    await this.userRepo.delete(userId);
  }

  async createCabinet(payload: { name: string; type: CabinetType }) {
    if (!Object.values(CabinetType).includes(payload.type)) {
      throw new BadRequestException('无效的内阁类型');
    }
    const existing = await this.cabinetRepo.findOne({ where: { name: payload.name } });
    if (existing) {
      throw new BadRequestException('内阁名称已存在');
    }
    const cabinet = this.cabinetRepo.create({
      name: payload.name,
      type: payload.type,
    });
    return this.cabinetRepo.save(cabinet);
  }

  async deleteCabinet(cabinetId: string) {
    const cabinet = await this.cabinetRepo.findOne({ where: { id: cabinetId } });
    if (!cabinet) {
      throw new NotFoundException('内阁不存在');
    }

    // 涉及该内阁的群聊：优先按 session_members 关联查询（拉群结构），兼容旧版 cabinetA/cabinetB 字段
    const memberSessions = await this.sessionMemberRepo.find({
      where: { cabinetId },
    });
    const legacySessions = await this.sessionRepo.find({
      where: [{ cabinetA_id: cabinetId }, { cabinetB_id: cabinetId }],
    });
    const sessionIds = [
      ...new Set([
        ...memberSessions.map((m) => m.sessionId),
        ...legacySessions.map((s) => s.id),
      ]),
    ];

    let messages: Message[] = [];
    if (sessionIds.length > 0) {
      messages = await this.messageRepo
        .createQueryBuilder('m')
        .where('m.sessionId IN (:...ids)', { ids: sessionIds })
        .getMany();
    }

    const messageFileIds = new Set(messages.map((m) => m.fileId));
    // 群聊消息文件保留给学术组审议；仅删除该内阁的空间文件（非消息文件）
    const cabinetFiles = (await this.fileRepo.find({ where: { targetId: cabinetId } })).filter(
      (f) => !messageFileIds.has(f.id),
    );

    const removePhysical = (storagePath: string) => {
      const fullPath = path.join(this.uploadBaseDir, storagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    };

    for (const f of cabinetFiles) {
      removePhysical(f.storagePath);
    }

    if (cabinetFiles.length > 0) {
      await this.fileRepo.delete(cabinetFiles.map((f) => ({ id: f.id })));
    }
    if (sessionIds.length > 0) {
      await this.sessionMemberRepo.delete({ sessionId: In(sessionIds), cabinetId });
    }
    await this.userRepo.delete({ cabinetId });
    await this.cabinetRepo.delete(cabinetId);

    const cabinetDir = path.join(this.uploadBaseDir, 'cabinet', cabinetId);
    if (fs.existsSync(cabinetDir)) {
      fs.rmSync(cabinetDir, { recursive: true, force: true });
    }

    this.eventsService.emit({
      type: 'cabinet.deleted',
      targetId: cabinetId,
      ts: Date.now(),
    });
    this.eventsService.emit({ type: 'session.changed', ts: Date.now() });
  }
}
