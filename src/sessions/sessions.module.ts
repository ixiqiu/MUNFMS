import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { Session } from '../entities/session.entity';
import { Message } from '../entities/message.entity';
import { FileEntity } from '../entities/file.entity';
import { Cabinet } from '../entities/cabinet.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Message, FileEntity, Cabinet]),
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
export class SessionsModule {}
