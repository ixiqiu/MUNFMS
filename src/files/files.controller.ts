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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Response } from 'express';
import { FilesService } from './files.service';
import { SpacePermissionGuard } from '../common/guards/space-permission.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
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
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/temp',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        callback(null, `${uniqueSuffix}${ext}`);
      },
    }),
  }))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('space') spaceType: SpaceType,
    @CurrentUser() user: { id: string; cabinetId: string; role: UserRole },
  ) {
    if (!file) {
      throw new Error('未提供文件');
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
    
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
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
