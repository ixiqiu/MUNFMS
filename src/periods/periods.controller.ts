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

import { Controller, Get, Post, Put, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { PeriodsService } from './periods.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UserRole } from '../entities/user.entity';
import { EventsService } from '../events/events.service';

@Controller('periods')
@UseGuards(JwtAuthGuard)
export class PeriodsController {
  constructor(
    private readonly periodsService: PeriodsService,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * 会期列表（全部已登录用户可读）
   */
  @Get()
  async list() {
    return this.periodsService.list();
  }

  /**
   * 当前会期（代表只读展示用）
   */
  @Get('current')
  async getCurrent() {
    return this.periodsService.getCurrent();
  }

  /**
   * 创建会期（仅学术组）：按 number 幂等，已存在即返回已有会期
   */
  @Post()
  async create(
    @Body() body: { number: number; name?: string },
    @CurrentUser() user: { id: string; role: UserRole; cabinetId: string | null },
  ) {
    if (user.role !== UserRole.ACADEMIC) {
      throw new ForbiddenException('仅学术组可管理会期');
    }
    return this.periodsService.create(body);
  }

  /**
   * 切换当前会期（仅学术组）：更新后广播 period.changed，各端即时刷新
   */
  @Put('current')
  async setCurrent(
    @Body() body: { periodId: string },
    @CurrentUser() user: { id: string; role: UserRole; cabinetId: string | null },
  ) {
    if (user.role !== UserRole.ACADEMIC) {
      throw new ForbiddenException('仅学术组可管理会期');
    }
    return this.periodsService.setCurrent(body.periodId, user.id);
  }

  /**
   * 设置会期基准时间与流动比（仅学术组）：锚定当前现实时刻并立即开始流动
   */
  @Put('time')
  async setTime(
    @Body() body: { simTime: string; flowRatio: number },
    @CurrentUser() user: { id: string; role: UserRole; cabinetId: string | null },
  ) {
    if (user.role !== UserRole.ACADEMIC) {
      throw new ForbiddenException('仅学术组可管理会期');
    }
    return this.periodsService.setTime(body, user.id);
  }

  /**
   * 暂停会期时间流动（仅学术组）
   */
  @Put('time/pause')
  async pauseTime(
    @CurrentUser() user: { id: string; role: UserRole; cabinetId: string | null },
  ) {
    if (user.role !== UserRole.ACADEMIC) {
      throw new ForbiddenException('仅学术组可管理会期');
    }
    return this.periodsService.pauseTime(user.id);
  }

  /**
   * 恢复会期时间流动（仅学术组）
   */
  @Put('time/resume')
  async resumeTime(
    @CurrentUser() user: { id: string; role: UserRole; cabinetId: string | null },
  ) {
    if (user.role !== UserRole.ACADEMIC) {
      throw new ForbiddenException('仅学术组可管理会期');
    }
    return this.periodsService.resumeTime(user.id);
  }
}
