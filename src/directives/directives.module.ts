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
import { DirectivesController } from './directives.controller';
import { DirectivesService } from './directives.service';
import { Directive } from '../entities/directive.entity';
import { DirectiveType } from '../entities/directive-type.entity';
import { GlobalState } from '../entities/global-state.entity';
import { ConferencePeriod } from '../entities/conference-period.entity';
import { FileEntity } from '../entities/file.entity';
import { Cabinet } from '../entities/cabinet.entity';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Directive,
      DirectiveType,
      GlobalState,
      ConferencePeriod,
      FileEntity,
      Cabinet,
    ]),
    EventsModule,
  ],
  controllers: [DirectivesController],
  providers: [DirectivesService],
})
export class DirectivesModule {}
