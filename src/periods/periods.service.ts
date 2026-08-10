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

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConferencePeriod } from '../entities/conference-period.entity';
import { GlobalState } from '../entities/global-state.entity';
import { EventsService } from '../events/events.service';

@Injectable()
export class PeriodsService {
  constructor(
    @InjectRepository(ConferencePeriod) private readonly periodRepo: Repository<ConferencePeriod>,
    @InjectRepository(GlobalState) private readonly stateRepo: Repository<GlobalState>,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * 确保全局状态单行存在（原子、并发安全）：镜像 notifications.service.ts 的
   * ensureSettingRow 模式 —— 多请求同时发现行不存在时，INSERT OR IGNORE 静默跳过
   * 撞主键的重复插入，而非 findOne+save 的并发双插崩溃。
   */
  private async ensureStateRow(): Promise<void> {
    await this.stateRepo
      .createQueryBuilder()
      .insert()
      .into(GlobalState)
      .values({ id: '1', currentPeriodId: null, updatedAt: new Date() })
      .orIgnore()
      .execute();
  }

  /**
   * 会期列表，按编号升序
   */
  async list(): Promise<{ periods: ConferencePeriod[] }> {
    const periods = await this.periodRepo.find({ order: { number: 'ASC' } });
    return { periods };
  }

  /**
   * 当前会期（未设置时返回 null，代表只读展示用）+ 全局单一时钟状态
   */
  async getCurrent(): Promise<{
    period: ConferencePeriod | null;
    clock: { simTimeBase: Date | null; baseRealTime: Date | null; flowRatio: number; isRunning: boolean };
  }> {
    await this.ensureStateRow();
    const state = await this.stateRepo.findOneByOrFail({ id: '1' });
    const clock = this.getClock(state);
    if (!state.currentPeriodId) {
      return { period: null, clock };
    }
    const period = await this.periodRepo.findOneBy({ id: state.currentPeriodId });
    return { period: period ?? null, clock };
  }

  /**
   * 从全局状态行读取时钟字段（不会期存在与否都可用）
   */
  private getClock(state: GlobalState): {
    simTimeBase: Date | null;
    baseRealTime: Date | null;
    flowRatio: number;
    isRunning: boolean;
  } {
    return {
      simTimeBase: state.simTimeBase ?? null,
      baseRealTime: state.baseRealTime ?? null,
      flowRatio: state.flowRatio,
      isRunning: state.isRunning,
    };
  }

  /**
   * 创建会期：按 number 幂等 —— 已存在直接返回已有会期，不产生重复
   */
  async create(body: { number: number; name?: string }): Promise<{ period: ConferencePeriod }> {
    if (!Number.isInteger(body.number) || body.number <= 0) {
      throw new BadRequestException('会期编号必须为正整数');
    }
    const existing = await this.periodRepo.findOneBy({ number: body.number });
    if (existing) {
      return { period: existing };
    }
    const period = await this.periodRepo.save(
      this.periodRepo.create({
        number: body.number,
        name: body.name?.trim() || null,
      }),
    );
    return { period };
  }

  /**
   * 切换当前会期：校验会期存在 → UPDATE 单行 → 广播 period.changed（事件只传信号，不传数据）
   */
  async setCurrent(periodId: string, actorId: string): Promise<{ period: ConferencePeriod }> {
    const period = await this.periodRepo.findOneBy({ id: periodId });
    if (!period) {
      throw new NotFoundException('会期不存在');
    }
    await this.ensureStateRow();
    await this.stateRepo.update({ id: '1' }, { currentPeriodId: periodId });
    this.eventsService.emit({
      type: 'period.changed',
      targetId: periodId,
      actorId,
      ts: Date.now(),
    });
    return { period };
  }

  /**
   * 设置会期基准时间与流动比：锚定当前现实时刻，立即开始流动
   */
  async setTime(body: { simTime: string; flowRatio: number }, actorId: string): Promise<{ clock: ReturnType<PeriodsService['getClock']> }> {
    if (!Number.isFinite(body.flowRatio) || body.flowRatio <= 0 || body.flowRatio > 100000) {
      throw new BadRequestException('时间流动比必须为正数且不超过 100000');
    }
    const parsed = new Date(body.simTime);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('会期时间格式无效');
    }
    await this.ensureStateRow();
    await this.stateRepo.update(
      { id: '1' },
      { simTimeBase: parsed, baseRealTime: new Date(), flowRatio: body.flowRatio, isRunning: true },
    );
    const state = await this.stateRepo.findOneByOrFail({ id: '1' });
    this.eventsService.emit({
      type: 'period.changed',
      targetId: state.currentPeriodId ?? undefined,
      actorId,
      ts: Date.now(),
    });
    return { clock: this.getClock(state) };
  }

  /**
   * 暂停流动：若正在流动且锚点齐全，先把推算的当前会期时间固化进 simTimeBase，再停表；
   * baseRealTime 保持原值不重置（resume 时重置）。
   */
  async pauseTime(actorId: string): Promise<{ clock: ReturnType<PeriodsService['getClock']> }> {
    await this.ensureStateRow();
    const state = await this.stateRepo.findOneByOrFail({ id: '1' });
    if (state.isRunning && state.simTimeBase && state.baseRealTime) {
      const currentSim = state.simTimeBase.getTime() + (Date.now() - state.baseRealTime.getTime()) * state.flowRatio;
      await this.stateRepo.update({ id: '1' }, { simTimeBase: new Date(currentSim), isRunning: false });
    } else {
      await this.stateRepo.update({ id: '1' }, { isRunning: false });
    }
    const updated = await this.stateRepo.findOneByOrFail({ id: '1' });
    this.eventsService.emit({
      type: 'period.changed',
      targetId: updated.currentPeriodId ?? undefined,
      actorId,
      ts: Date.now(),
    });
    return { clock: this.getClock(updated) };
  }

  /**
   * 恢复流动：重置现实锚点为当前服务器时间，重新开始流动
   */
  async resumeTime(actorId: string): Promise<{ clock: ReturnType<PeriodsService['getClock']> }> {
    await this.ensureStateRow();
    const state = await this.stateRepo.findOneByOrFail({ id: '1' });
    if (!state.simTimeBase) {
      throw new BadRequestException('请先设置会期时间');
    }
    await this.stateRepo.update({ id: '1' }, { baseRealTime: new Date(), isRunning: true });
    const updated = await this.stateRepo.findOneByOrFail({ id: '1' });
    this.eventsService.emit({
      type: 'period.changed',
      targetId: updated.currentPeriodId ?? undefined,
      actorId,
      ts: Date.now(),
    });
    return { clock: this.getClock(updated) };
  }
}
