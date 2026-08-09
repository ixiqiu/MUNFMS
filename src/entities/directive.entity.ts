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

export enum DirectiveStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

@Entity('directives')
@Index(['periodId', 'cabinetId', 'typeId', 'sequence'], { unique: true }) // 编号并发兜底
export class Directive {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  periodId: string; // 归属会期（自动=当前）

  @Column()
  typeId: string; // 普通列，不建 FK

  @Column()
  typeName: string; // 快照（删类型不受影响）

  @Column()
  cabinetId: string; // 提交内阁

  @Column({ type: 'text' })
  content: string; // 必填

  @Column({ nullable: true })
  fileId: string | null; // 提交附件（SpaceType=DIRECTIVE）

  @Column({ type: 'simple-enum', enum: DirectiveStatus, default: DirectiveStatus.PENDING })
  status: DirectiveStatus;

  @Column({ type: 'text', nullable: true })
  reply: string | null; // 答复文本（可空）

  @Column({ nullable: true })
  replyFileId: string | null; // 答复附件（图片内联展示）

  @Column()
  sequence: number; // (会期,内阁,类型) 内 MAX+1

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date | null;

  @Column({ nullable: true })
  reviewerId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
