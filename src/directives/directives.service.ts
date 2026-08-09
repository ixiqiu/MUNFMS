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
  OnModuleInit,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Directive, DirectiveStatus } from '../entities/directive.entity';
import { DirectiveType } from '../entities/directive-type.entity';
import { GlobalState } from '../entities/global-state.entity';
import { ConferencePeriod } from '../entities/conference-period.entity';
import { FileEntity, SpaceType } from '../entities/file.entity';
import { Cabinet } from '../entities/cabinet.entity';
import { UserRole } from '../entities/user.entity';
import { EventsService } from '../events/events.service';

const PRESET_TYPE_NAMES = ['外交指令', '内政指令', '情报指令', '舆情指令', '军事指令', '经济指令'];

export interface DirectiveUser {
  id: string;
  name: string;
  role: UserRole;
  cabinetId: string | null;
}

@Injectable()
export class DirectivesService implements OnModuleInit {
  private readonly uploadBaseDir = path.join(process.cwd(), 'uploads', 'directive');

  constructor(
    @InjectRepository(Directive)
    private directiveRepo: Repository<Directive>,
    @InjectRepository(DirectiveType)
    private typeRepo: Repository<DirectiveType>,
    @InjectRepository(GlobalState)
    private globalStateRepo: Repository<GlobalState>,
    @InjectRepository(ConferencePeriod)
    private periodRepo: Repository<ConferencePeriod>,
    @InjectRepository(FileEntity)
    private fileRepo: Repository<FileEntity>,
    @InjectRepository(Cabinet)
    private cabinetRepo: Repository<Cabinet>,
    private eventsService: EventsService,
  ) {
    this.ensureUploadDirs();
  }

  private ensureUploadDirs(): void {
    if (!fs.existsSync(this.uploadBaseDir)) {
      fs.mkdirSync(this.uploadBaseDir, { recursive: true });
    }
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  }

  // —— 预设指令类型播种（表空时，镜像 admin.service.ts seedAdmin 模式）——
  async onModuleInit(): Promise<void> {
    const count = await this.typeRepo.count();
    if (count > 0) {
      return;
    }
    await this.typeRepo.save(
      PRESET_TYPE_NAMES.map((name, index) =>
        this.typeRepo.create({ name, isPreset: true, sortOrder: index }),
      ),
    );
  }

  // —— 当前会期（GlobalState 单行 id='1'）——
  private async getCurrentPeriod(): Promise<ConferencePeriod> {
    const state = await this.globalStateRepo.findOne({ where: { id: '1' } });
    if (!state?.currentPeriodId) {
      throw new BadRequestException('当前无会期，无法提交指令');
    }
    const period = await this.periodRepo.findOne({ where: { id: state.currentPeriodId } });
    if (!period) {
      throw new BadRequestException('当前会期不存在');
    }
    return period;
  }

  // —— 附件落地：temp -> uploads/directive/ + FileEntity(SpaceType.DIRECTIVE) ——
  private async persistFile(file: Express.Multer.File, uploaderId: string): Promise<FileEntity> {
    const uniqueFileName = `${uuidv4()}_${file.originalname}`;
    const destPath = path.join(this.uploadBaseDir, uniqueFileName);
    await fs.promises.rename(file.path, destPath);
    try {
      const fileEntity = this.fileRepo.create({
        fileName: file.originalname,
        storagePath: path.join('directive', uniqueFileName),
        spaceType: SpaceType.DIRECTIVE,
        uploaderId,
        targetId: null,
        isFromConference: false,
      });
      return await this.fileRepo.save(fileEntity);
    } catch (error) {
      if (fs.existsSync(destPath)) {
        await fs.promises.unlink(destPath).catch(() => {});
      }
      throw error;
    }
  }

  // —— 提交指令（仅代表，须有内阁）——
  async create(
    user: DirectiveUser,
    body: { typeId: string; content: string },
    file: Express.Multer.File | null,
  ): Promise<Directive> {
    if (user.role !== UserRole.DELEGATE || !user.cabinetId) {
      throw new ForbiddenException('仅代表可提交指令');
    }
    if (!body.content || !body.content.trim()) {
      throw new BadRequestException('指令内容不能为空');
    }
    const type = await this.typeRepo.findOne({ where: { id: body.typeId } });
    if (!type) {
      throw new NotFoundException('指令类型不存在');
    }
    const period = await this.getCurrentPeriod();

    // (会期, 内阁, 类型) 内 MAX(sequence)+1，删除不回填；唯一索引兜底并发
    const maxRow = await this.directiveRepo
      .createQueryBuilder('d')
      .select('MAX(d.sequence)', 'max')
      .where('d.periodId = :periodId', { periodId: period.id })
      .andWhere('d.cabinetId = :cabinetId', { cabinetId: user.cabinetId })
      .andWhere('d.typeId = :typeId', { typeId: type.id })
      .getRawOne<{ max: number | null }>();
    const sequence = (maxRow?.max ?? 0) + 1;

    let savedFile: FileEntity | null = null;
    try {
      if (file) {
        savedFile = await this.persistFile(file, user.id);
      }
      const directive = this.directiveRepo.create({
        periodId: period.id,
        typeId: type.id,
        typeName: type.name, // 快照（删类型不受影响）
        cabinetId: user.cabinetId,
        content: body.content.trim(),
        fileId: savedFile?.id ?? null,
        status: DirectiveStatus.PENDING,
        reply: null,
        replyFileId: null,
        sequence,
        reviewedAt: null,
        reviewerId: null,
      });
      const saved = await this.directiveRepo.save(directive);
      this.eventsService.emit({
        type: 'directive.new',
        targetId: user.cabinetId,
        actorId: user.id,
        ts: Date.now(),
      });
      return saved;
    } catch (error) {
      if (savedFile) {
        const fullPath = path.join(process.cwd(), 'uploads', savedFile.storagePath);
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath).catch(() => {});
        }
        await this.fileRepo.delete(savedFile.id).catch(() => {});
      } else if (file && fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path).catch(() => {});
      }
      throw error;
    }
  }

  // —— 列表（学术组全部 / 代表本内阁），附内阁名与附件文件名 ——
  async list(
    user: DirectiveUser,
    query: { periodId?: string; typeId?: string; cabinetId?: string },
  ): Promise<{ directives: any[] }> {
    const qb = this.directiveRepo.createQueryBuilder('d');
    if (user.role === UserRole.DELEGATE) {
      qb.where('d.cabinetId = :cabinetId', { cabinetId: user.cabinetId });
    } else if (user.role !== UserRole.ACADEMIC) {
      throw new ForbiddenException('无权查看指令');
    }
    if (query.periodId) {
      qb.andWhere('d.periodId = :periodId', { periodId: query.periodId });
    }
    if (query.typeId) {
      qb.andWhere('d.typeId = :typeId', { typeId: query.typeId });
    }
    if (query.cabinetId && user.role === UserRole.ACADEMIC) {
      qb.andWhere('d.cabinetId = :filterCabinetId', { filterCabinetId: query.cabinetId });
    }
    qb.orderBy('d.createdAt', 'DESC');
    const directives = await qb.getMany();

    const cabinetIds = [...new Set(directives.map((d) => d.cabinetId))];
    const cabinets = cabinetIds.length
      ? await this.cabinetRepo.find({ where: cabinetIds.map((id) => ({ id })) })
      : [];
    const cabinetNameMap = new Map(cabinets.map((c) => [c.id, c.name]));

    const fileIds = [
      ...new Set(
        directives
          .flatMap((d) => [d.fileId, d.replyFileId])
          .filter((id): id is string => !!id),
      ),
    ];
    const files = fileIds.length
      ? await this.fileRepo.find({ where: fileIds.map((id) => ({ id })) })
      : [];
    const fileMap = new Map(files.map((f) => [f.id, f]));

    const periodIds = [...new Set(directives.map((d) => d.periodId))];
    const periods = periodIds.length
      ? await this.periodRepo.find({ where: periodIds.map((id) => ({ id })) })
      : [];
    const periodNumberMap = new Map(periods.map((p) => [p.id, p.number]));

    return {
      directives: directives.map((d) => ({
        ...d,
        cabinetName: cabinetNameMap.get(d.cabinetId) ?? null,
        file: d.fileId && fileMap.has(d.fileId)
          ? { id: d.fileId, fileName: fileMap.get(d.fileId)!.fileName }
          : null,
        replyFile: d.replyFileId && fileMap.has(d.replyFileId)
          ? { id: d.replyFileId, fileName: fileMap.get(d.replyFileId)!.fileName }
          : null,
        period: periodNumberMap.has(d.periodId)
          ? { number: periodNumberMap.get(d.periodId)! }
          : null,
      })),
    };
  }

  // —— 删除待审指令（仅代表本人内阁 + PENDING）——
  async remove(user: DirectiveUser, id: string): Promise<void> {
    const directive = await this.directiveRepo.findOne({ where: { id } });
    if (!directive) {
      throw new NotFoundException('指令不存在');
    }
    if (user.role !== UserRole.DELEGATE || !user.cabinetId || directive.cabinetId !== user.cabinetId) {
      throw new ForbiddenException('仅可删除本内阁的指令');
    }
    if (directive.status !== DirectiveStatus.PENDING) {
      throw new BadRequestException('仅可删除等待审核的指令');
    }

    // 先解除附件引用并删物理文件，再删指令行（镜像 files.service.ts 删除顺序）
    if (directive.fileId) {
      const file = await this.fileRepo.findOne({ where: { id: directive.fileId } });
      if (file) {
        const fullPath = path.join(process.cwd(), 'uploads', file.storagePath);
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath);
        }
        await this.fileRepo.delete(file.id);
      }
    }
    await this.directiveRepo.delete(id);

    // 删除即从列表消失，广播 directive.changed 供学术组列表刷新（状态省略）
    this.eventsService.emit({
      type: 'directive.changed',
      targetId: directive.cabinetId,
      actorId: user.id,
      ts: Date.now(),
    });
  }

  // —— 审核（仅学术组；ACCEPTED/REJECTED；不可重复）——
  async review(
    user: DirectiveUser,
    id: string,
    body: { status: DirectiveStatus; reply?: string },
    replyFile: Express.Multer.File | null,
  ): Promise<Directive> {
    if (user.role !== UserRole.ACADEMIC) {
      throw new ForbiddenException('仅学术组可审核指令');
    }
    const directive = await this.directiveRepo.findOne({ where: { id } });
    if (!directive) {
      throw new NotFoundException('指令不存在');
    }
    if (directive.status !== DirectiveStatus.PENDING) {
      throw new BadRequestException('该指令已审核，不可重复操作');
    }
    if (body.status !== DirectiveStatus.ACCEPTED && body.status !== DirectiveStatus.REJECTED) {
      throw new BadRequestException('无效的审核状态');
    }

    let savedFile: FileEntity | null = null;
    try {
      if (replyFile) {
        savedFile = await this.persistFile(replyFile, user.id);
      }
      directive.status = body.status;
      directive.reply = body.reply?.trim() ? body.reply.trim() : null;
      directive.replyFileId = savedFile?.id ?? null;
      directive.reviewedAt = new Date();
      directive.reviewerId = user.id;
      const saved = await this.directiveRepo.save(directive);
      this.eventsService.emit({
        type: 'directive.changed',
        targetId: directive.cabinetId,
        status: body.status,
        actorId: user.id,
        ts: Date.now(),
      });
      return saved;
    } catch (error) {
      if (savedFile) {
        const fullPath = path.join(process.cwd(), 'uploads', savedFile.storagePath);
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath).catch(() => {});
        }
        await this.fileRepo.delete(savedFile.id).catch(() => {});
      } else if (replyFile && fs.existsSync(replyFile.path)) {
        await fs.promises.unlink(replyFile.path).catch(() => {});
      }
      throw error;
    }
  }

  // —— 附件下载（本人内阁 DELEGATE 或 ACADEMIC）——
  private async getDownloadable(
    user: DirectiveUser,
    id: string,
    field: 'fileId' | 'replyFileId',
  ): Promise<{ readStream: fs.ReadStream; fileName: string }> {
    const directive = await this.directiveRepo.findOne({ where: { id } });
    if (!directive) {
      throw new NotFoundException('指令不存在');
    }
    const canAccess =
      user.role === UserRole.ACADEMIC ||
      (user.role === UserRole.DELEGATE &&
        !!user.cabinetId &&
        directive.cabinetId === user.cabinetId);
    if (!canAccess) {
      throw new ForbiddenException('无权下载该文件');
    }
    const fileId = directive[field];
    if (!fileId) {
      throw new NotFoundException('指令没有附件');
    }
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('文件不存在');
    }
    const fullPath = path.join(process.cwd(), 'uploads', file.storagePath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('物理文件不存在');
    }
    return { readStream: fs.createReadStream(fullPath), fileName: file.fileName };
  }

  async downloadAttachment(
    user: DirectiveUser,
    id: string,
  ): Promise<{ readStream: fs.ReadStream; fileName: string }> {
    return this.getDownloadable(user, id, 'fileId');
  }

  async downloadReply(
    user: DirectiveUser,
    id: string,
  ): Promise<{ readStream: fs.ReadStream; fileName: string }> {
    return this.getDownloadable(user, id, 'replyFileId');
  }

  // —— 指令类型管理 ——
  async listTypes(): Promise<{ types: DirectiveType[] }> {
    const types = await this.typeRepo.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    return { types };
  }

  async createType(user: DirectiveUser, body: { name: string }): Promise<{ type: DirectiveType }> {
    const name = body.name?.trim() ?? '';
    if (!name) {
      throw new BadRequestException('类型名称不能为空');
    }
    const existing = await this.typeRepo.findOne({ where: { name } });
    if (existing) {
      throw new BadRequestException('该指令类型已存在');
    }
    const maxRow = await this.typeRepo
      .createQueryBuilder('t')
      .select('MAX(t.sortOrder)', 'max')
      .getRawOne<{ max: number | null }>();
    const type = this.typeRepo.create({
      name,
      isPreset: false,
      sortOrder: (maxRow?.max ?? -1) + 1,
    });
    const saved = await this.typeRepo.save(type);
    return { type: saved };
  }

  async deleteType(user: DirectiveUser, id: string): Promise<{ message: string }> {
    const type = await this.typeRepo.findOne({ where: { id } });
    if (!type) {
      throw new NotFoundException('指令类型不存在');
    }
    // 指令保留 typeName 快照，无需级联
    await this.typeRepo.delete(id);
    return { message: '删除成功' };
  }
}
