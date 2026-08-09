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

export enum SpaceType {
  CABINET = 'CABINET',
  PUBLIC = 'PUBLIC',
  CONFERENCE = 'CONFERENCE',
  CONSULT = 'CONSULT',
  TIMELINE = 'TIMELINE',
  DIRECTIVE = 'DIRECTIVE',
  ASYMMETRIC = 'ASYMMETRIC',
}

@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileName: string; // 原始文件名

  @Column()
  storagePath: string; // 本地物理相对路径 (如: cabinet/uuid_xxx.pdf)

  @Column({
    type: 'simple-enum',
    enum: SpaceType,
  })
  spaceType: SpaceType;

  @Column()
  uploaderId: string; // 上传者 User ID

  @Column({ nullable: true })
  targetId: string; // 归属目标 ID (如内阁ID，或公共/会议空间的全局标识)

  @Column({ default: false })
  isFromConference: boolean; // 标记是否由会议空间一键复制而来

  @CreateDateColumn()
  createdAt: Date;
}
