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

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Session } from './session.entity';
import { FileEntity } from './file.entity';

export enum MessageSenderType {
  CABINET = 'CABINET',
  ACADEMIC = 'ACADEMIC',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Session)
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @Column()
  sessionId: string;

  @Column({ nullable: true })
  senderCabinetId: string | null;

  @Column({
    type: 'simple-enum',
    enum: MessageSenderType,
    default: MessageSenderType.CABINET,
  })
  senderType: MessageSenderType;

  @ManyToOne(() => FileEntity)
  @JoinColumn({ name: 'fileId' })
  file: FileEntity | null;

  @Column({ nullable: true })
  fileId: string | null;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ nullable: true })
  senderUserId: string | null;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
