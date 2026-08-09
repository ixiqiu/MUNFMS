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

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { NotificationSetting } from '../entities/notification-setting.entity';
import { UserSessionDnd } from '../entities/user-session-dnd.entity';
import { EventsService } from '../events/events.service';

const REPORT_STALE_MS = 90_000; // 轮询上报超过 90s 视为过期（客户端轮询模式下每 15s 续报）

export type ConnectionStatus = 'online' | 'polling' | 'offline';

export interface OverviewRow {
  userId: string;
  name: string;
  cabinetName: string;
  enabled: boolean;
  lastPermission: string | null;
  lastPermissionAt: Date | null;
  connectionStatus: ConnectionStatus;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(NotificationSetting) private readonly settingRepo: Repository<NotificationSetting>,
    @InjectRepository(UserSessionDnd) private readonly dndRepo: Repository<UserSessionDnd>,
    private readonly eventsService: EventsService,
  ) {}

  // —— 设置 ——

  /**
   * 确保设置行存在（原子、并发安全）：前端登录时 getSettings + reportConnectionMode +
   * reportPermission 几乎同时发出，多个请求可能同时发现行不存在。
   * 用 INSERT OR IGNORE 而非 findOne+save：并发双插时后者会撞 UNIQUE(userId) 约束，
   * 且失败事务残留使 catch 内重读在 sqlite 快照下仍看不到对方已提交的行。
   */
  private async ensureSettingRow(userId: string): Promise<void> {
    await this.settingRepo
      .createQueryBuilder()
      .insert()
      .into(NotificationSetting)
      .values({ userId, enabled: true, createdAt: new Date(), updatedAt: new Date() })
      .orIgnore()
      .execute();
  }

  async getSettings(userId: string): Promise<{ enabled: boolean; dndSessionIds: string[] }> {
    await this.ensureSettingRow(userId);
    const setting = await this.settingRepo.findOneOrFail({ where: { userId } });
    const dndRows = await this.dndRepo.find({ where: { userId } });
    return { enabled: setting.enabled, dndSessionIds: dndRows.map((r) => r.sessionId) };
  }

  async setEnabled(userId: string, enabled: boolean): Promise<{ enabled: boolean }> {
    await this.ensureSettingRow(userId);
    // 局部更新：避免与并发上报（permission / connection-mode）互相覆盖整行
    await this.settingRepo.update({ userId }, { enabled });
    return { enabled };
  }

  async setDnd(userId: string, sessionId: string, muted: boolean): Promise<{ muted: boolean }> {
    const existing = await this.dndRepo.findOne({ where: { userId, sessionId } });
    if (muted && !existing) {
      // INSERT OR IGNORE：并发双插撞 (userId, sessionId) 唯一约束时静默跳过
      await this.dndRepo
        .createQueryBuilder()
        .insert()
        .into(UserSessionDnd)
        .values({ userId, sessionId, createdAt: new Date() })
        .orIgnore()
        .execute();
    }
    if (!muted && existing) await this.dndRepo.remove(existing);
    return { muted };
  }

  async reportPermission(userId: string, state: string): Promise<void> {
    await this.ensureSettingRow(userId);
    await this.settingRepo.update({ userId }, { lastPermission: state, lastPermissionAt: new Date() });
  }

  async reportConnectionMode(userId: string, mode: string): Promise<void> {
    await this.ensureSettingRow(userId);
    await this.settingRepo.update({ userId }, { reportedMode: mode, lastReportAt: new Date() });
  }

  // —— 学术团队总控（只读）——
  async getOverview(q?: string): Promise<{ delegates: OverviewRow[] }> {
    const users = await this.userRepo.find({
      where: { role: UserRole.DELEGATE },
      relations: { cabinet: true },
      order: { name: 'ASC' },
    });
    const settings = await this.settingRepo.find({ where: { userId: In(users.map((u) => u.id)) } });
    const map = new Map(settings.map((s) => [s.userId, s]));
    const now = Date.now();
    let rows: OverviewRow[] = users.map((u) => {
      const s = map.get(u.id);
      const reportedPolling = s?.reportedMode === 'polling' && s.lastReportAt
        && now - s.lastReportAt.getTime() < REPORT_STALE_MS;
      let connectionStatus: ConnectionStatus;
      if (this.eventsService.isConnected(u.id)) {
        connectionStatus = 'online';                // 服务端实时 SSE 连接（ground truth）
      } else if (reportedPolling) {
        connectionStatus = 'polling';               // 客户端上报轮询回退（新鲜才认）
      } else {
        connectionStatus = 'offline';               // 无连接且无新鲜轮询上报
      }
      return {
        userId: u.id,
        name: u.name,
        cabinetName: u.cabinet?.name ?? '',
        enabled: s?.enabled ?? true,                // 缺省行视为开启
        lastPermission: s?.lastPermission ?? null,
        lastPermissionAt: s?.lastPermissionAt ?? null,
        connectionStatus,
      };
    });
    if (q) {
      const kw = q.trim().toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(kw) || r.cabinetName.toLowerCase().includes(kw));
    }
    return { delegates: rows };
  }
}
