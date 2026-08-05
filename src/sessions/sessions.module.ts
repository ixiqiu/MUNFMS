import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { Session } from '../entities/session.entity';
import { SessionMember } from '../entities/session-member.entity';
import { Message } from '../entities/message.entity';
import { FileEntity } from '../entities/file.entity';
import { Cabinet } from '../entities/cabinet.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, SessionMember, Message, FileEntity, Cabinet, User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'mun-secret-key'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule implements OnModuleInit {
  constructor(private readonly sessionsService: SessionsService) {}

  async onModuleInit() {
    await this.sessionsService.migrateLegacySessions();
  }
}
