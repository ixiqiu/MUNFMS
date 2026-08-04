import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { SessionsModule } from './sessions/sessions.module';
import { Cabinet } from './entities/cabinet.entity';
import { User } from './entities/user.entity';
import { FileEntity } from './entities/file.entity';
import { Session } from './entities/session.entity';
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
            entities: [Cabinet, User, FileEntity, Session, Message],
            synchronize: true, // 生产环境应设为 false
            logging: configService.get<boolean>('DB_LOGGING', false),
          };
        } else {
          // SQLite (默认)
          return {
            type: 'sqlite',
            database: configService.get<string>('SQLITE_DB_PATH', 'dev.db'),
            entities: [Cabinet, User, FileEntity, Session, Message],
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
  ],
})
export class AppModule {}
