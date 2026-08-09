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
import { AsymmetricController } from './asymmetric.controller';
import { AsymmetricService } from './asymmetric.service';
import { AsymMessage } from '../entities/asym-message.entity';
import { Cabinet } from '../entities/cabinet.entity';
import { FileEntity } from '../entities/file.entity';
import { User } from '../entities/user.entity';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AsymMessage, Cabinet, FileEntity, User]),
    EventsModule,
  ],
  controllers: [AsymmetricController],
  providers: [AsymmetricService],
})
export class AsymmetricModule {}
