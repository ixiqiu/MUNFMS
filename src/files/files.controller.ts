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
  Delete, 
  Param, 
  Query, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile, 
  Body,
  Res,
  StreamableFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService } from './files.service';
import { SpacePermissionGuard } from '../common/guards/space-permission.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { createUploadOptions } from '../common/upload.util';
import { setContentDisposition } from '../common/download.util';
import { SpaceType } from '../entities/file.entity';
import { UserRole } from '../entities/user.entity';

@Controller('files')
@UseGuards(SpacePermissionGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * 上传文件
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', createUploadOptions('./uploads/temp', 50 * 1024 * 1024)))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('space') spaceType: SpaceType,
    @CurrentUser() user: { id: string; cabinetId: string; role: UserRole },
  ) {
    if (!file) {
      throw new BadRequestException('未提供文件');
    }
    
    const result = await this.filesService.uploadFile(file, spaceType, user);
    return { message: '上传成功', file: result };
  }

  /**
   * 获取文件列表
   */
  @Get()
  async getFiles(
    @Query('space') spaceType: SpaceType,
    @Query('type') type?: string,
    @CurrentUser() user?: { id: string; cabinetId: string; role: UserRole },
  ) {
    const files = await this.filesService.getFiles(spaceType, user, type);
    return { files };
  }

  /**
   * 下载文件
   */
  @Get(':id/download')
  async downloadFile(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; cabinetId: string; role: UserRole },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { readStream, fileName } = await this.filesService.downloadFile(id, user);
    
    setContentDisposition(res, fileName);
    return new StreamableFile(readStream);
  }

  /**
   * 一键复制到公共空间
   */
  @Post(':id/publish')
  async publishToPublic(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; cabinetId: string; role: UserRole },
  ) {
    const result = await this.filesService.publishToPublic(id, user);
    return { message: '发布成功', file: result };
  }

  /**
   * 删除文件
   */
  @Delete(':id')
  async deleteFile(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; cabinetId: string; role: UserRole },
  ) {
    await this.filesService.deleteFile(id, user);
    return { message: '删除成功' };
  }
}
