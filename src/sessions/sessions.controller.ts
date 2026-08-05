import { 
  Controller, 
  Get, 
  Post, 
  Param, 
  Query, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile, 
  Res,
  StreamableFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, Options as MulterOptions } from 'multer';
import { extname } from 'path';
import { Response } from 'express';
import { SessionsService } from './sessions.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../entities/user.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const uploadOptions = {
  defParamCharset: 'utf8',
  storage: diskStorage({
    destination: './uploads/temp',
    filename: (req, file, callback) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = extname(file.originalname);
      callback(null, `${uniqueSuffix}${ext}`);
    },
  }),
} as MulterOptions;

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  /**
   * 获取当前内阁的磋商会话列表及未读数
   */
  @Get()
  async getSessions(@CurrentUser() user: { id: string; cabinetId: string; role: UserRole }) {
    const sessions = await this.sessionsService.getSessions(user.cabinetId);
    return { sessions };
  }

  /**
   * 获取或创建会话
   */
  @Post('create')
  async getOrCreateSession(
    @Query('targetCabinetId') targetCabinetId: string,
    @CurrentUser() user: { id: string; cabinetId: string; role: UserRole },
  ) {
    const session = await this.sessionsService.getOrCreateSession(user.cabinetId, targetCabinetId);
    return { session };
  }

  /**
   * 获取特定会话的聊天记录
   */
  @Get(':id/messages')
  async getMessages(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; cabinetId: string; role: UserRole },
  ) {
    const messages = await this.sessionsService.getMessages(id, user.cabinetId);
    return { messages };
  }

  /**
   * 发送磋商文件消息
   */
  @Post(':id/messages')
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  async sendMessage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string; cabinetId: string; role: UserRole },
  ) {
    if (!file) {
      throw new BadRequestException('未提供文件');
    }

    const message = await this.sessionsService.sendMessage(id, file, user.cabinetId, user.id);
    return { message };
  }

  /**
   * 下载磋商文件
   */
  @Get('messages/:messageId/download')
  async downloadFile(
    @Param('messageId') messageId: string,
    @CurrentUser() user: { id: string; cabinetId: string; role: UserRole },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { readStream, fileName } = await this.sessionsService.downloadFile(messageId, user.cabinetId);
    
    const asciiFallback = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    return new StreamableFile(readStream);
  }
}
