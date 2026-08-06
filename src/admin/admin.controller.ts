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
