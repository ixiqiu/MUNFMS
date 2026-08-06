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
import { Cabinet } from './cabinet.entity';

export enum UserRole {
  ADMIN = 'ADMIN',
  DELEGATE = 'DELEGATE',
  ACADEMIC = 'ACADEMIC',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'simple-enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column()
  passwordHash: string;

  @ManyToOne(() => Cabinet)
  @JoinColumn({ name: 'cabinetId' })
  cabinet: Cabinet | null;

  @Column({ nullable: true })
  cabinetId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
