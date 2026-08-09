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

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { MessageSenderType } from './message.entity';

@Entity('asym_messages')
export class AsymMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  cabinetId: string; // 对话方内阁

  @Column({ type: 'simple-enum', enum: MessageSenderType, default: MessageSenderType.CABINET })
  senderType: MessageSenderType; // 复用现有枚举 CABINET/ACADEMIC

  @Column()
  senderUserId: string;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ nullable: true })
  fileId: string | null; // 附件（SpaceType=ASYMMETRIC）

  @Column({ default: false })
  isRead: boolean; // 对方已读（简化：同内阁成员共享）

  @CreateDateColumn()
  createdAt: Date;
}
