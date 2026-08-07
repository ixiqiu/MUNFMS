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

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { randomBytes } from 'crypto';
import { SpaceType } from '../entities/file.entity';

export type SseEventType =
  | 'file.changed'
  | 'session.changed'
  | 'message.new'
  | 'cabinet.deleted';

export interface SseEvent {
  type: SseEventType;
  spaceType?: SpaceType;
  targetId?: string | null;
  sessionId?: string;
  actorId?: string;
  ts: number;
}

const TICKET_TTL_MS = 60_000; // 票据有效期 60s
const CLEANUP_INTERVAL_MS = 60_000; // 每 60s 清理过期票据

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly event$ = new Subject<SseEvent>();
  private readonly tickets = new Map<string, { userId: string; expiresAt: number }>();
  private cleanupTimer: NodeJS.Timeout;

  // —— 票据 ——

  /**
   * 签发一次性连接票据（60s 过期）
   */
  issueTicket(userId: string): string {
    const ticket = randomBytes(32).toString('hex');
    this.tickets.set(ticket, { userId, expiresAt: Date.now() + TICKET_TTL_MS });
    return ticket;
  }

  /**
   * 校验并消费票据（一次性使用，消费后立即删除；缺失或过期返回 null）
   */
  consumeTicket(ticket: string): string | null {
    const entry = this.tickets.get(ticket);
    this.tickets.delete(ticket); // 一次性使用即焚
    if (!entry) {
      return null;
    }
    if (entry.expiresAt < Date.now()) {
      return null;
    }
    return entry.userId;
  }

  // —— 广播 ——

  emit(event: SseEvent): void {
    this.event$.next(event);
  }

  observe(): Observable<SseEvent> {
    return this.event$.asObservable();
  }

  // —— 生命周期 ——

  onModuleInit(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [ticket, entry] of this.tickets) {
        if (entry.expiresAt < now) {
          this.tickets.delete(ticket);
        }
      }
    }, CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
  }
}
