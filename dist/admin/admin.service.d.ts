import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Cabinet, CabinetType } from '../entities/cabinet.entity';
import { FileEntity } from '../entities/file.entity';
import { Session } from '../entities/session.entity';
import { SessionMember } from '../entities/session-member.entity';
import { Message } from '../entities/message.entity';
import { EventsService } from '../events/events.service';
export declare class AdminService {
    private userRepo;
    private cabinetRepo;
    private fileRepo;
    private sessionRepo;
    private sessionMemberRepo;
    private messageRepo;
    private eventsService;
    private readonly uploadBaseDir;
    constructor(userRepo: Repository<User>, cabinetRepo: Repository<Cabinet>, fileRepo: Repository<FileEntity>, sessionRepo: Repository<Session>, sessionMemberRepo: Repository<SessionMember>, messageRepo: Repository<Message>, eventsService: EventsService);
    seedAdmin(): Promise<User>;
    listUsers(): Promise<{
        id: string;
        name: string;
        role: UserRole;
        cabinetId: string;
        cabinet: {
            id: string;
            name: string;
            type: CabinetType;
        };
        createdAt: Date;
    }[]>;
    createUser(payload: {
        name: string;
        password: string;
        role: UserRole;
        cabinetId?: string;
    }): Promise<{
        id: string;
        name: string;
        role: UserRole;
        cabinet: Cabinet | null;
        cabinetId: string | null;
        createdAt: Date;
    }>;
    changePassword(userId: string, newPassword: string): Promise<void>;
    deleteUser(userId: string, operatorId: string): Promise<void>;
    createCabinet(payload: {
        name: string;
        type: CabinetType;
    }): Promise<Cabinet>;
    deleteCabinet(cabinetId: string): Promise<void>;
}
