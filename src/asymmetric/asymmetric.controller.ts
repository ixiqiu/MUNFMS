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
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AsymmetricService } from './asymmetric.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { createUploadOptions } from '../common/upload.util';
import { setContentDisposition, getMimeType } from '../common/download.util';
import { UserRole } from '../entities/user.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('asymmetric')
@UseGuards(JwtAuthGuard)
export class AsymmetricController {
  constructor(private readonly asymmetricService: AsymmetricService) {}

  /**
   * 频道列表（学术组：全部内阁；代表：本内阁单通道）
   */
  @Get('channels')
  async getChannels(@CurrentUser() user: { id: string; cabinetId: string; role: UserRole }) {
    const channels = await this.asymmetricService.channels(user);
    return { channels };
  }

  /**
   * 消息列表（代表强制本内阁，学术组可指定任意内阁）
   */
  @Get('messages')
  async getMessages(
    @Query('cabinetId') cabinetId: string | undefined,
    @CurrentUser() user: { id: string; cabinetId: string; role: UserRole },
  ) {
    const messages = await this.asymmetricService.messages(user, cabinetId);
    return { messages };
  }

  /**
   * 发送消息（文字 / 附件，至少其一）
   */
  @Post('messages')
  @UseInterceptors(
    FileInterceptor('file', createUploadOptions('./uploads/temp', 50 * 1024 * 1024)),
  )
  async sendMessage(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { cabinetId?: string; content?: string },
    @CurrentUser() user: { id: string; cabinetId: string; role: UserRole },
  ) {
    const message = await this.asymmetricService.send(user, body, file ?? null);
    return { message };
  }

  /**
   * 附件下载（仅消息对应内阁成员或学术组）
   */
  @Get('messages/:id/download')
  async downloadFile(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; cabinetId: string; role: UserRole },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { readStream, fileName } = await this.asymmetricService.download(id, user);
    res.setHeader('Content-Type', getMimeType(fileName));
    setContentDisposition(res, fileName);
    return new StreamableFile(readStream);
  }
}
