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

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum TimelineEntryType {
  SITUATION = 'SITUATION',
  NEWS = 'NEWS',
}

@Entity('timeline_entries')
@Index(['periodId', 'type', 'sequence'], { unique: true }) // 编号并发兜底
export class TimelineEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  periodId: string; // 归属会期（自动=当前，前端不可改）

  @Column({ type: 'simple-enum', enum: TimelineEntryType })
  type: TimelineEntryType;

  @Column({ type: 'varchar', nullable: true })
  newsSource: string | null; // 仅新闻

  @Column({ type: 'text', nullable: true })
  content: string | null; // 可与附件二选一

  @Column({ nullable: true })
  fileId: string | null; // 附件（FileEntity，SpaceType=TIMELINE）

  @Column()
  sequence: number; // 该会期该类型内序号（MAX+1，删除不回填）

  @CreateDateColumn()
  createdAt: Date;
}
