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

import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_notification_settings')
export class NotificationSetting {
  @PrimaryColumn()                       // 1:1，主键即 userId（懒创建：首次访问设置/上报权限时插入）
  userId: string;

  @Column({ default: true })
  enabled: boolean;                      // 默认开启

  @Column({ type: 'varchar', nullable: true })   // 'granted' | 'denied' | 'default' | null（未上报）
  lastPermission: string | null;

  @Column({ type: 'datetime', nullable: true })
  lastPermissionAt: Date | null;

  @Column({ type: 'varchar', nullable: true })   // 客户端上报的连接模式：'sse' | 'polling' | null（未上报）
  reportedMode: string | null;

  @Column({ type: 'datetime', nullable: true })
  lastReportAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
