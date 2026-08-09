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
import { TimelineEntry, TimelineEntryType } from '../entities/timeline-entry.entity';
import { GlobalState } from '../entities/global-state.entity';
import { ConferencePeriod } from '../entities/conference-period.entity';
import { FileEntity, SpaceType } from '../entities/file.entity';
import { UserRole } from '../entities/user.entity';
import { EventsService } from '../events/events.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TimelineService {
  private readonly uploadBaseDir = path.join(process.cwd(), 'uploads', 'timeline');

  constructor(
    @InjectRepository(TimelineEntry)
    private entryRepo: Repository<TimelineEntry>,
    @InjectRepository(GlobalState)
    private globalStateRepo: Repository<GlobalState>,
    @InjectRepository(ConferencePeriod)
    private periodRepo: Repository<ConferencePeriod>,
    @InjectRepository(FileEntity)
    private fileRepo: Repository<FileEntity>,
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
   * 读取当前会期（GlobalState 单行 id='1' 的 currentPeriodId）
   */
  private async getCurrentPeriodId(): Promise<string> {
    const state = await this.globalStateRepo.findOne({ where: { id: '1' } });
    if (!state?.currentPeriodId) {
      throw new BadRequestException('当前无会期，请先在会期管理设置当前会期');
    }
    return state.currentPeriodId;
  }

  /**
   * 发布时间线条目（仅学术组）：内容与附件至少其一；
   * 附件从 uploads/temp rename 到 uploads/timeline 并落 FileEntity（SpaceType=TIMELINE）；
   * 编号 = (periodId, type) 内 MAX(sequence)+1，唯一索引兜底并发。
   */
  async create(
    user: { id: string; role: UserRole },
    body: { type: TimelineEntryType; newsSource?: string; content?: string },
    file?: Express.Multer.File,
  ): Promise<TimelineEntry> {
    const periodId = await this.getCurrentPeriodId();
    const content = body.content?.trim() || null;
    // 新闻来源仅对 NEWS 有意义
    const newsSource =
      body.type === TimelineEntryType.NEWS ? body.newsSource?.trim() || null : null;

    if (!content && !file) {
      throw new BadRequestException('内容与附件至少填写一项');
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
        const relativePath = path.join('timeline', uniqueFileName);

        await fs.promises.rename(file.path, storagePath);

        const fileEntity = this.fileRepo.create({
          fileName: file.originalname,
          storagePath: relativePath,
          spaceType: SpaceType.TIMELINE,
          uploaderId: user.id,
          targetId: periodId,
          isFromConference: false,
        });
        const savedFile = await this.fileRepo.save(fileEntity);
        fileId = savedFile.id;
      }

      // 该会期该类型内序号：MAX(sequence)+1（删除不回填；唯一索引兜底并发）
      const last = await this.entryRepo.findOne({
        where: { periodId, type: body.type },
        order: { sequence: 'DESC' },
      });
      const sequence = (last?.sequence ?? 0) + 1;

      const entry = this.entryRepo.create({
        periodId,
        type: body.type,
        newsSource,
        content,
        fileId,
        sequence,
      });
      const savedEntry = await this.entryRepo.save(entry);

      this.eventsService.emit({
        type: 'timeline.changed',
        targetId: periodId,
        entryType: savedEntry.type,
        actorId: user.id,
        ts: Date.now(),
      });

      return savedEntry;
    } catch (error) {
      // 数据库写入失败时清理已移动的文件
      if (storagePath && fs.existsSync(storagePath)) {
        await fs.promises.unlink(storagePath);
      }
      throw error;
    }
  }

  /**
   * 时间线列表（混排按发布时间倒序），支持 periodId / type 组合过滤；
   * 附带会期编号（period.number）与附件信息（file.id / file.fileName）。
   */
  async list(filters: { periodId?: string; type?: TimelineEntryType }): Promise<any[]> {
    const qb = this.entryRepo.createQueryBuilder('e');
    if (filters.periodId) {
      qb.andWhere('e.periodId = :periodId', { periodId: filters.periodId });
    }
    if (filters.type) {
      qb.andWhere('e.type = :type', { type: filters.type });
    }
    qb.orderBy('e.createdAt', 'DESC');
    const entries = await qb.getMany();

    // 批量拉取会期编号与附件文件名，避免 N+1
    const periodIds = [...new Set(entries.map((e) => e.periodId))];
    const periods = periodIds.length
      ? await this.periodRepo.find({
          where: periodIds.map((id) => ({ id })),
        })
      : [];
    const periodNumberMap = new Map(periods.map((p) => [p.id, p.number]));

    const fileIds = entries.map((e) => e.fileId).filter((id): id is string => !!id);
    const files = fileIds.length
      ? await this.fileRepo.find({
          where: fileIds.map((id) => ({ id })),
        })
      : [];
    const fileMap = new Map(files.map((f) => [f.id, { id: f.id, fileName: f.fileName }]));

    return entries.map((e) => ({
      ...e,
      period: periodNumberMap.has(e.periodId)
        ? { number: periodNumberMap.get(e.periodId) as number }
        : null,
      file: e.fileId && fileMap.has(e.fileId) ? (fileMap.get(e.fileId) as { id: string; fileName: string }) : null,
    }));
  }

  /**
   * 删除时间线条目（仅学术组）：先解除 fileId 引用再删物理文件与 FileEntity 记录（镜像 files.service.ts 顺序）
   */
  async remove(id: string, user: { id: string; role: UserRole }): Promise<void> {
    const entry = await this.entryRepo.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException('时间线条目不存在');
    }

    if (entry.fileId) {
      const file = await this.fileRepo.findOne({ where: { id: entry.fileId } });
      if (file) {
        // 删除物理文件
        const fullPath = path.join(process.cwd(), 'uploads', file.storagePath);
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath);
        }
        // 先解除条目对文件的引用（fileId 外键引用 files），再删文件记录
        await this.entryRepo.update(entry.id, { fileId: null });
        await this.fileRepo.delete(file.id);
      }
    }

    await this.entryRepo.delete(entry.id);

    this.eventsService.emit({
      type: 'timeline.changed',
      targetId: entry.periodId,
      entryType: entry.type,
      actorId: user.id,
      ts: Date.now(),
    });
  }

  /**
   * 附件下载（DELEGATE + ACADEMIC；ADMIN 无权访问）
   */
  async download(
    id: string,
    user: { id: string; role: UserRole },
  ): Promise<{ readStream: fs.ReadStream; fileName: string }> {
    const entry = await this.entryRepo.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException('时间线条目不存在');
    }
    if (!entry.fileId) {
      throw new NotFoundException('该条目没有附件');
    }
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('管理员无权访问');
    }

    const file = await this.fileRepo.findOne({ where: { id: entry.fileId } });
    if (!file) {
      throw new NotFoundException('附件记录不存在');
    }

    const fullPath = path.join(process.cwd(), 'uploads', file.storagePath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('物理文件不存在');
    }

    const readStream = fs.createReadStream(fullPath);
    return { readStream, fileName: file.fileName };
  }
}
