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

import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { Cabinet } from '../entities/cabinet.entity';
import { FileEntity } from '../entities/file.entity';
import { Session } from '../entities/session.entity';
import { SessionMember } from '../entities/session-member.entity';
import { Message } from '../entities/message.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Cabinet, FileEntity, Session, SessionMember, Message]),
    EventsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule implements OnModuleInit {
  constructor(private readonly adminService: AdminService) {}

  async onModuleInit() {
    const admin = await this.adminService.seedAdmin();
    if (admin) {
      console.log(
        `[AdminModule] 初始管理员已创建: ${admin.name} / admin123（请尽快修改密码）`,
      );
    }
  }
}
