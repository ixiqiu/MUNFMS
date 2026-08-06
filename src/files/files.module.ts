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

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FileEntity } from '../entities/file.entity';
import { User } from '../entities/user.entity';
import { Cabinet } from '../entities/cabinet.entity';
import { Session } from '../entities/session.entity';
import { Message } from '../entities/message.entity';
import { SpacePermissionGuard } from '../common/guards/space-permission.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([FileEntity, User, Cabinet, Session, Message]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'mun-secret-key'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService, SpacePermissionGuard],
  exports: [FilesService],
})
export class FilesModule {}
