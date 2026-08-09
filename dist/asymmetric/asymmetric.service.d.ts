import { Repository } from 'typeorm';
import { AsymMessage } from '../entities/asym-message.entity';
import { MessageSenderType } from '../entities/message.entity';
import { FileEntity } from '../entities/file.entity';
import { Cabinet } from '../entities/cabinet.entity';
import { User, UserRole } from '../entities/user.entity';
import { EventsService } from '../events/events.service';
import * as fs from 'fs';
export declare class AsymmetricService {
    private asymRepo;
    private cabinetRepo;
    private fileRepo;
    private userRepo;
    private eventsService;
    private readonly uploadBaseDir;
    constructor(asymRepo: Repository<AsymMessage>, cabinetRepo: Repository<Cabinet>, fileRepo: Repository<FileEntity>, userRepo: Repository<User>, eventsService: EventsService);
    private ensureUploadDirs;
    channels(user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<{
        cabinetId: string;
        cabinetName: string;
        lastMessageAt: string;
        unreadCount: number;
    }[]>;
    private buildChannel;
    messages(user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }, cabinetId?: string): Promise<{
        file: {
            id: string;
            fileName: string;
        };
        senderName: string;
        senderCabinetName: string;
        id: string;
        cabinetId: string;
        senderType: MessageSenderType;
        senderUserId: string;
        content: string | null;
        fileId: string | null;
        isRead: boolean;
        createdAt: Date;
    }[]>;
    send(user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }, body: {
        cabinetId?: string;
        content?: string;
    }, file: Express.Multer.File | null): Promise<AsymMessage>;
    download(id: string, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<{
        readStream: fs.ReadStream;
        fileName: string;
    }>;
}
