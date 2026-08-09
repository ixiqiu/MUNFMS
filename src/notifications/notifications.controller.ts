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

import { Controller, Get, Put, Post, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../entities/user.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('settings')          // GET  /api/notifications/settings
  async getSettings(@CurrentUser() user: User) {
    return this.service.getSettings(user.id);
  }

  @Put('settings')          // PUT  /api/notifications/settings  body { enabled: boolean }（仅本人）
  async setSettings(@CurrentUser() user: User, @Body() body: { enabled: boolean }) {
    return this.service.setEnabled(user.id, body.enabled);
  }

  @Put('dnd/:sessionId')    // PUT  /api/notifications/dnd/:sessionId  body { muted: boolean }（仅本人）
  async setDnd(@CurrentUser() user: User, @Param('sessionId') sessionId: string,
               @Body() body: { muted: boolean }) {
    return this.service.setDnd(user.id, sessionId, body.muted);
  }

  @Post('permission-state') // POST /api/notifications/permission-state  body { state: 'granted'|'denied'|'default' }
  async reportPermission(@CurrentUser() user: User, @Body() body: { state: string }) {
    await this.service.reportPermission(user.id, body.state);
    return { ok: true };
  }

  @Post('connection-state') // POST /api/notifications/connection-state  body { mode: 'sse'|'polling' }
  async reportConnectionMode(@CurrentUser() user: User, @Body() body: { mode: string }) {
    await this.service.reportConnectionMode(user.id, body.mode);
    return { ok: true };
  }

  @Get('overview')          // GET  /api/notifications/overview?q=xxx （仅 ACADEMIC，只读）
  async getOverview(@CurrentUser() user: User, @Query('q') q?: string) {
    if (user.role !== UserRole.ACADEMIC) throw new ForbiddenException('仅学术组可访问通知总控');
    return this.service.getOverview(q);
  }
}
