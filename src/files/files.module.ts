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
