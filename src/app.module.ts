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
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { SessionsModule } from './sessions/sessions.module';
import { CabinetsModule } from './cabinets/cabinets.module';
import { AdminModule } from './admin/admin.module';
import { Cabinet } from './entities/cabinet.entity';
import { User } from './entities/user.entity';
import { FileEntity } from './entities/file.entity';
import { Session } from './entities/session.entity';
import { SessionMember } from './entities/session-member.entity';
import { Message } from './entities/message.entity';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // TypeORM 数据库配置
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get<string>('DB_TYPE', 'sqlite');
        
        if (dbType === 'mariadb') {
          return {
            type: 'mariadb',
            host: configService.get<string>('DB_HOST', 'localhost'),
            port: configService.get<number>('DB_PORT', 3306),
            username: configService.get<string>('DB_USERNAME', 'root'),
            password: configService.get<string>('DB_PASSWORD', ''),
            database: configService.get<string>('DB_DATABASE', 'mun_files'),
            entities: [Cabinet, User, FileEntity, Session, SessionMember, Message],
            synchronize: true, // 生产环境应设为 false
            logging: configService.get<boolean>('DB_LOGGING', false),
          };
        } else {
          // SQLite (默认)
          return {
            type: 'sqlite',
            database: configService.get<string>('SQLITE_DB_PATH', 'dev.db'),
            entities: [Cabinet, User, FileEntity, Session, SessionMember, Message],
            synchronize: true,
            logging: configService.get<boolean>('DB_LOGGING', false),
          };
        }
      },
    }),
    
    // 功能模块
    AuthModule,
    FilesModule,
    SessionsModule,
    CabinetsModule,
    AdminModule,
  ],
})
export class AppModule {}
