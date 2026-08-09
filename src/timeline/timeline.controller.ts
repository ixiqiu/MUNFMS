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
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { TimelineService } from './timeline.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { createUploadOptions } from '../common/upload.util';
import { setContentDisposition, getMimeType } from '../common/download.util';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UserRole } from '../entities/user.entity';
import { TimelineEntryType } from '../entities/timeline-entry.entity';

@Controller('timeline')
@UseGuards(JwtAuthGuard)
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  /**
   * 时间线列表（DELEGATE + ACADEMIC；ADMIN 无权访问），支持 periodId / type 组合过滤
   */
  @Get()
  async list(
    @Query('periodId') periodId: string | undefined,
    @Query('type') type: string | undefined,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('管理员无权访问');
    }
    const entries = await this.timelineService.list({
      periodId: periodId || undefined,
      type:
        type === TimelineEntryType.SITUATION || type === TimelineEntryType.NEWS
          ? type
          : undefined,
    });
    return { entries };
  }

  /**
   * 发布时间线条目（仅学术组）：multipart 字段 type / newsSource? / content? / file?
   */
  @Post()
  @UseInterceptors(FileInterceptor('file', createUploadOptions('./uploads/temp', 50 * 1024 * 1024)))
  async create(
    @Body() body: { type: TimelineEntryType; newsSource?: string; content?: string },
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    if (user.role !== UserRole.ACADEMIC) {
      throw new ForbiddenException('仅学术组可发布时间线');
    }
    if (body.type !== TimelineEntryType.SITUATION && body.type !== TimelineEntryType.NEWS) {
      throw new BadRequestException('无效的时间线类型');
    }
    const entry = await this.timelineService.create(user, body, file);
    return { entry };
  }

  /**
   * 删除时间线条目（仅学术组，不可编辑，误删重发）
   */
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    if (user.role !== UserRole.ACADEMIC) {
      throw new ForbiddenException('仅学术组可发布时间线');
    }
    await this.timelineService.remove(id, user);
    return { message: '时间线条目已删除' };
  }

  /**
   * 附件下载（DELEGATE + ACADEMIC；图片也走此端点，前端 blob 预览）
   */
  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { readStream, fileName } = await this.timelineService.download(id, user);
    res.setHeader('Content-Type', getMimeType(fileName));
    setContentDisposition(res, fileName);
    return new StreamableFile(readStream);
  }
}
