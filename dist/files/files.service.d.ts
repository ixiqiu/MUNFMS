import { Repository } from 'typeorm';
import { FileEntity, SpaceType } from '../entities/file.entity';
import { User, UserRole } from '../entities/user.entity';
import { Message } from '../entities/message.entity';
import { EventsService } from '../events/events.service';
import * as fs from 'fs';
export declare class FilesService {
    private fileRepo;
    private userRepo;
    private messageRepo;
    private eventsService;
    private readonly uploadBaseDir;
    constructor(fileRepo: Repository<FileEntity>, userRepo: Repository<User>, messageRepo: Repository<Message>, eventsService: EventsService);
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
