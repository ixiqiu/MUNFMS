import { StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { SessionsService } from './sessions.service';
import { UserRole } from '../entities/user.entity';
export declare class SessionsController {
    private readonly sessionsService;
    constructor(sessionsService: SessionsService);
    getSessions(user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<{
        sessions: any[];
    }>;
    createGroupSession(body: {
        cabinetIds: string[];
        name?: string;
    }, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<{
        session: import("../entities").Session;
    }>;
    renameSession(id: string, body: {
        name: string;
    }, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<{
        session: import("../entities").Session;
    }>;
    dissolveSession(id: string, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<{
        message: string;
    }>;
    leaveSession(id: string, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<{
        message: string;
    }>;
    getMessages(id: string, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<{
        messages: any[];
    }>;
    sendMessage(id: string, file: Express.Multer.File, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<{
        message: import("../entities/message.entity").Message;
    }>;
    downloadFile(messageId: string, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }, res: Response): Promise<StreamableFile>;
}
