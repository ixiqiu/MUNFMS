import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { Directive, DirectiveStatus } from '../entities/directive.entity';
import { DirectiveType } from '../entities/directive-type.entity';
import { GlobalState } from '../entities/global-state.entity';
import { ConferencePeriod } from '../entities/conference-period.entity';
import { FileEntity } from '../entities/file.entity';
import { Cabinet } from '../entities/cabinet.entity';
import { UserRole } from '../entities/user.entity';
import { EventsService } from '../events/events.service';
export interface DirectiveUser {
    id: string;
    name: string;
    role: UserRole;
    cabinetId: string | null;
}
export declare class DirectivesService implements OnModuleInit {
    private directiveRepo;
    private typeRepo;
    private globalStateRepo;
    private periodRepo;
    private fileRepo;
    private cabinetRepo;
    private eventsService;
    private readonly uploadBaseDir;
    constructor(directiveRepo: Repository<Directive>, typeRepo: Repository<DirectiveType>, globalStateRepo: Repository<GlobalState>, periodRepo: Repository<ConferencePeriod>, fileRepo: Repository<FileEntity>, cabinetRepo: Repository<Cabinet>, eventsService: EventsService);
    private ensureUploadDirs;
    onModuleInit(): Promise<void>;
    private getCurrentPeriod;
    private persistFile;
    create(user: DirectiveUser, body: {
        typeId: string;
        content: string;
    }, file: Express.Multer.File | null): Promise<Directive>;
    list(user: DirectiveUser, query: {
        periodId?: string;
        typeId?: string;
        cabinetId?: string;
    }): Promise<{
        directives: any[];
    }>;
    remove(user: DirectiveUser, id: string): Promise<void>;
    review(user: DirectiveUser, id: string, body: {
        status: DirectiveStatus;
        reply?: string;
    }, replyFile: Express.Multer.File | null): Promise<Directive>;
    private getDownloadable;
    downloadAttachment(user: DirectiveUser, id: string): Promise<{
        readStream: fs.ReadStream;
        fileName: string;
    }>;
    downloadReply(user: DirectiveUser, id: string): Promise<{
        readStream: fs.ReadStream;
        fileName: string;
    }>;
    listTypes(): Promise<{
        types: DirectiveType[];
    }>;
    createType(user: DirectiveUser, body: {
        name: string;
    }): Promise<{
        type: DirectiveType;
    }>;
    deleteType(user: DirectiveUser, id: string): Promise<{
        message: string;
    }>;
}
