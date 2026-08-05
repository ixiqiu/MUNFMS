import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { Cabinet } from '../entities/cabinet.entity';
import { FileEntity } from '../entities/file.entity';
import { Session } from '../entities/session.entity';
import { Message } from '../entities/message.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Cabinet, FileEntity, Session, Message]),
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
