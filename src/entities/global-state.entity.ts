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

import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('global_state')
export class GlobalState {
  @PrimaryColumn({ default: '1' })
  id: string; // 固定单行（懒创建，镜像 NotificationSetting 模式）

  @Column({ nullable: true })
  currentPeriodId: string | null; // 手动 FK，不建关系

  @UpdateDateColumn()
  updatedAt: Date;
}
