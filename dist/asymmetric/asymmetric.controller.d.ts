import { StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { AsymmetricService } from './asymmetric.service';
import { UserRole } from '../entities/user.entity';
export declare class AsymmetricController {
    private readonly asymmetricService;
    constructor(asymmetricService: AsymmetricService);
    getChannels(user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<{
        channels: {
            cabinetId: string;
            cabinetName: string;
            lastMessageAt: string;
            unreadCount: number;
        }[];
    }>;
    getMessages(cabinetId: string | undefined, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<{
        messages: {
            file: {
                id: string;
                fileName: string;
            };
            senderName: string;
            senderCabinetName: string;
            id: string;
            cabinetId: string;
            senderType: import("../entities").MessageSenderType;
            senderUserId: string;
            content: string | null;
            fileId: string | null;
            isRead: boolean;
            createdAt: Date;
        }[];
    }>;
    sendMessage(file: Express.Multer.File | undefined, body: {
        cabinetId?: string;
        content?: string;
    }, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<{
        message: import("../entities").AsymMessage;
    }>;
    downloadFile(id: string, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }, res: Response): Promise<StreamableFile>;
}
