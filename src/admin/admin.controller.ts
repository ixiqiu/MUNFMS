import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, CabinetType } from '../entities';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Post('users')
  createUser(
    @Body()
    body: {
      name: string;
      password: string;
      role: UserRole;
      cabinetId?: string;
    },
  ) {
    return this.adminService.createUser(body);
  }

  @Patch('users/:id/password')
  changePassword(
    @Param('id') id: string,
    @Body() body: { newPassword: string },
  ) {
    return this.adminService.changePassword(id, body.newPassword);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @CurrentUser() operator: { id: string }) {
    return this.adminService.deleteUser(id, operator.id);
  }

  @Post('cabinets')
  createCabinet(@Body() body: { name: string; type: CabinetType }) {
    return this.adminService.createCabinet(body);
  }

  @Delete('cabinets/:id')
  deleteCabinet(@Param('id') id: string) {
    return this.adminService.deleteCabinet(id);
  }
}
