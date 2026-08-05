import { StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { FilesService } from './files.service';
import { SpaceType } from '../entities/file.entity';
import { UserRole } from '../entities/user.entity';
export declare class FilesController {
    private readonly filesService;
    constructor(filesService: FilesService);
    uploadFile(file: Express.Multer.File, spaceType: SpaceType, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<{
        message: string;
        file: import("../entities/file.entity").FileEntity;
    }>;
    getFiles(spaceType: SpaceType, type?: string, user?: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<{
        files: import("../entities/file.entity").FileEntity[];
    }>;
    downloadFile(id: string, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }, res: Response): Promise<StreamableFile>;
    publishToPublic(id: string, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<{
        message: string;
        file: import("../entities/file.entity").FileEntity;
    }>;
    deleteFile(id: string, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<{
        message: string;
    }>;
}
