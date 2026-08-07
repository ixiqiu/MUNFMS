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
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

const HEARTBEAT_INTERVAL_MS = 25_000; // 心跳注释行，防代理掐断空闲连接

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * 换取 SSE 连接票据（Bearer header 鉴权，60s 一次性使用）
   */
  @Post('ticket')
  @UseGuards(JwtAuthGuard)
  issueTicket(@CurrentUser() user: User): { ticket: string } {
    return { ticket: this.eventsService.issueTicket(user.id) };
  }

  /**
   * SSE 事件流（原始 Express 处理器，不用 @Sse 装饰器以便完全控制心跳与头部）
   */
  @Get('stream')
  stream(
    @Query('ticket') ticket: string,
    @Req() _req: Request,
    @Res() res: Response,
  ): void {
    const userId = this.eventsService.consumeTicket(ticket);
    if (!userId) {
      // 此时尚未写入 SSE 响应头，正常返回 JSON 401
      throw new UnauthorizedException('无效或已过期的连接票据');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 防 nginx 缓冲
    res.flushHeaders();
    res.write('retry: 3000\n\n');

    const sub = this.eventsService.observe().subscribe((event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
    const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_INTERVAL_MS);

    res.on('close', () => {
      clearInterval(heartbeat);
      sub.unsubscribe();
    });
  }
}
