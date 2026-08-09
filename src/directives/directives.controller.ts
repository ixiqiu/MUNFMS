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
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DirectivesService } from './directives.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { createUploadOptions } from '../common/upload.util';
import { setContentDisposition, getMimeType } from '../common/download.util';
import { UserRole } from '../entities/user.entity';
import { DirectiveStatus } from '../entities/directive.entity';

interface DirectiveRequestUser {
  id: string;
  name: string;
  role: UserRole;
  cabinetId: string | null;
}

@Controller('directives')
@UseGuards(JwtAuthGuard)
export class DirectivesController {
  constructor(private readonly directivesService: DirectivesService) {}

  // 注意路由顺序：/types 系列必须先于 /:id 系列声明

  /**
   * 指令类型列表（全部已登录可用，代表下拉选择）
   */
  @Get('types')
  async listTypes() {
    return this.directivesService.listTypes();
  }

  /**
   * 新增指令类型（仅管理员）
   */
  @Post('types')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createType(
    @Body() body: { name: string },
    @CurrentUser() user: DirectiveRequestUser,
  ) {
    return this.directivesService.createType(user, body);
  }

  /**
   * 删除指令类型（仅管理员；已提交指令保留类型名称快照）
   */
  @Delete('types/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deleteType(@Param('id') id: string, @CurrentUser() user: DirectiveRequestUser) {
    return this.directivesService.deleteType(user, id);
  }

  /**
   * 指令列表（学术组全部 / 代表本内阁），可按会期与类型组合过滤
   */
  @Get()
  async list(
    @Query() query: { periodId?: string; typeId?: string; cabinetId?: string },
    @CurrentUser() user: DirectiveRequestUser,
  ) {
    return this.directivesService.list(user, query);
  }

  /**
   * 提交指令（仅代表，须有内阁）；multipart：typeId、content、file?
   */
  @Post()
  @UseInterceptors(FileInterceptor('file', createUploadOptions('./uploads/temp', 50 * 1024 * 1024)))
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { typeId: string; content: string },
    @CurrentUser() user: DirectiveRequestUser,
  ) {
    return this.directivesService.create(user, body, file ?? null);
  }

  /**
   * 删除待审指令（仅代表本人内阁 + PENDING）
   */
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: DirectiveRequestUser) {
    await this.directivesService.remove(user, id);
    return { message: '删除成功' };
  }

  /**
   * 审核指令（仅学术组）；multipart：status、reply?、replyFile?
   */
  @Put(':id/review')
  @UseInterceptors(FileInterceptor('file', createUploadOptions('./uploads/temp', 50 * 1024 * 1024)))
  async review(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { status: DirectiveStatus; reply?: string },
    @CurrentUser() user: DirectiveRequestUser,
  ) {
    return this.directivesService.review(user, id, body, file ?? null);
  }

  /**
   * 提交附件下载（本人内阁 / 学术组）
   */
  @Get(':id/download')
  async downloadAttachment(
    @Param('id') id: string,
    @CurrentUser() user: DirectiveRequestUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { readStream, fileName } = await this.directivesService.downloadAttachment(user, id);
    res.setHeader('Content-Type', getMimeType(fileName));
    setContentDisposition(res, fileName);
    return new StreamableFile(readStream);
  }

  /**
   * 答复附件下载（本人内阁 / 学术组）
   */
  @Get(':id/download-reply')
  async downloadReply(
    @Param('id') id: string,
    @CurrentUser() user: DirectiveRequestUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { readStream, fileName } = await this.directivesService.downloadReply(user, id);
    res.setHeader('Content-Type', getMimeType(fileName));
    setContentDisposition(res, fileName);
    return new StreamableFile(readStream);
  }
}
