import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity';
import { Message } from '../entities/message.entity';
import { FileEntity } from '../entities/file.entity';
import { Cabinet } from '../entities/cabinet.entity';
import * as fs from 'fs';
export declare class SessionsService {
    private sessionRepo;
    private messageRepo;
    private fileRepo;
    private cabinetRepo;
    private readonly uploadBaseDir;
    constructor(sessionRepo: Repository<Session>, messageRepo: Repository<Message>, fileRepo: Repository<FileEntity>, cabinetRepo: Repository<Cabinet>);
    private ensureUploadDirs;
    getSessions(cabinetId: string): Promise<any[]>;
    getOrCreateSession(cabinetA_id: string, cabinetB_id: string): Promise<Session>;
    getMessages(sessionId: string, cabinetId: string): Promise<any[]>;
    sendMessage(sessionId: string, file: Express.Multer.File, senderCabinetId: string, uploaderId: string): Promise<Message>;
    downloadFile(messageId: string, cabinetId: string): Promise<{
        readStream: fs.ReadStream;
        fileName: string;
    }>;
}
