import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity';
import { SessionMember } from '../entities/session-member.entity';
import { Message, MessageSenderType } from '../entities/message.entity';
import { FileEntity } from '../entities/file.entity';
import { Cabinet } from '../entities/cabinet.entity';
import { User, UserRole } from '../entities/user.entity';
import { EventsService } from '../events/events.service';
import * as fs from 'fs';
export declare class SessionsService {
    private sessionRepo;
    private sessionMemberRepo;
    private messageRepo;
    private fileRepo;
    private cabinetRepo;
    private userRepo;
    private eventsService;
    private readonly uploadBaseDir;
    constructor(sessionRepo: Repository<Session>, sessionMemberRepo: Repository<SessionMember>, messageRepo: Repository<Message>, fileRepo: Repository<FileEntity>, cabinetRepo: Repository<Cabinet>, userRepo: Repository<User>, eventsService: EventsService);
    private ensureUploadDirs;
    private isMember;
    private hasFullSessionAccess;
    migrateLegacySessions(): Promise<void>;
    createGroupSession(cabinetIds: string[], name: string | undefined, creatorCabinetId: string): Promise<Session>;
    renameSession(sessionId: string, name: string, cabinetId: string, role: UserRole): Promise<Session>;
    dissolveSession(sessionId: string, role: UserRole): Promise<void>;
    leaveSession(sessionId: string, cabinetId: string): Promise<void>;
    private deleteSessionContent;
    getSessions(cabinetId: string, role: UserRole): Promise<any[]>;
    private countUnread;
    getMessages(sessionId: string, cabinetId: string, role: UserRole): Promise<any[]>;
    sendMessage(sessionId: string, file: Express.Multer.File | null, content: string | null, senderCabinetId: string | null, senderType: MessageSenderType, uploaderId: string, senderUserId: string, role: UserRole): Promise<Message>;
    copyFromCabinet(sessionId: string, fileId: string, user: {
        id: string;
        cabinetId: string;
        role: UserRole;
    }): Promise<Message>;
    downloadFile(messageId: string, cabinetId: string, role: UserRole): Promise<{
        readStream: fs.ReadStream;
        fileName: string;
        mimeType: string;
    }>;
}
