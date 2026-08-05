import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Body,
  Param, 
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
import { MessageSenderType } from '../entities/message.entity';
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
   * 获取群聊列表及未读数（代表：自己的群；学团：全部群）
   */
  @Get()
  async getSessions(@CurrentUser() user: { id: string; cabinetId: string; role: UserRole }) {
    const sessions = await this.sessionsService.getSessions(user.cabinetId, user.role);
    return { sessions };
  }

  /**
   * 拉群：创建或获取已有群聊（创建者自动成为成员，至少 1 个其他内阁）
   */
  @Post()
  async createGroupSession(
    @Body() body: { cabinetIds: string[]; name?: string },
    @CurrentUser() user: { id: string; cabinetId: string; role: UserRole },
  ) {
    if (user.role === UserRole.ACADEMIC || !user.cabinetId) {
      throw new BadRequestException('只有代表可以创建群聊');
    }
    const session = await this.sessionsService.createGroupSession(
      body.cabinetIds,
      body.name,
      user.cabinetId,
    );
    return { session };
  }

  /**
   * 修改群名
   */
  @Patch(':id')
  async renameSession(
    @Param('id') id: string,
    @Body() body: { name: string },
    @CurrentUser() user: { id: string; cabinetId: string; role: UserRole },
  ) {
    const session = await this.sessionsService.renameSession(
      id,
      body.name,
      user.cabinetId,
      user.role,
    );
    return { session };
  }

  // 旧单点接口已弃用（由 POST /api/sessions 拉群接口替代）
  // @Post('create')
  // async getOrCreateSession(
  //   @Query('targetCabinetId') targetCabinetId: string,
  //   @CurrentUser() user: { id: string; cabinetId: string; role: UserRole },
  // ) {
  //   const session = await this.sessionsService.getOrCreateSession(user.cabinetId, targetCabinetId);
  //   return { session };
  // }

  /**
   * 获取群聊消息记录
   */
  @Get(':id/messages')
  async getMessages(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; cabinetId: string; role: UserRole },
  ) {
    const messages = await this.sessionsService.getMessages(id, user.cabinetId, user.role);
    return { messages };
  }

  /**
   * 发送磋商文件消息（学团以组织身份发送）
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

    const isAcademic = user.role === UserRole.ACADEMIC;
    const message = await this.sessionsService.sendMessage(
      id,
      file,
      isAcademic ? null : user.cabinetId,
      isAcademic ? MessageSenderType.ACADEMIC : MessageSenderType.CABINET,
      user.id,
      user.role,
    );
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
    const { readStream, fileName } = await this.sessionsService.downloadFile(
      messageId,
      user.cabinetId,
      user.role,
    );
    
    const asciiFallback = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    return new StreamableFile(readStream);
  }
}
