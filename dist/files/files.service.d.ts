import { Repository } from 'typeorm';
import { FileEntity, SpaceType } from '../entities/file.entity';
import { User, UserRole } from '../entities/user.entity';
import * as fs from 'fs';
export declare class FilesService {
    private fileRepo;
    private userRepo;
    private readonly uploadBaseDir;
    constructor(fileRepo: Repository<FileEntity>, userRepo: Repository<User>);
    private ensureUploadDirs;
    uploadFile(file: Express.Multer.File, spaceType: SpaceType, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<FileEntity>;
    getFiles(spaceType: SpaceType, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }, type?: string): Promise<FileEntity[]>;
    private attachUploaderNames;
    getFile(fileId: string, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<FileEntity>;
    downloadFile(fileId: string, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<{
        readStream: fs.ReadStream;
        fileName: string;
    }>;
    publishToPublic(fileId: string, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<FileEntity>;
    deleteFile(fileId: string, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<void>;
}
