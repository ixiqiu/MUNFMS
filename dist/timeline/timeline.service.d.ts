import { Repository } from 'typeorm';
import { TimelineEntry, TimelineEntryType } from '../entities/timeline-entry.entity';
import { GlobalState } from '../entities/global-state.entity';
import { ConferencePeriod } from '../entities/conference-period.entity';
import { FileEntity } from '../entities/file.entity';
import { UserRole } from '../entities/user.entity';
import { EventsService } from '../events/events.service';
import * as fs from 'fs';
export declare class TimelineService {
    private entryRepo;
    private globalStateRepo;
    private periodRepo;
    private fileRepo;
    private eventsService;
    private readonly uploadBaseDir;
    constructor(entryRepo: Repository<TimelineEntry>, globalStateRepo: Repository<GlobalState>, periodRepo: Repository<ConferencePeriod>, fileRepo: Repository<FileEntity>, eventsService: EventsService);
    private ensureUploadDirs;
    private getCurrentPeriodId;
    create(user: {
        id: string;
        role: UserRole;
    }, body: {
        type: TimelineEntryType;
        newsSource?: string;
        content?: string;
    }, file?: Express.Multer.File): Promise<TimelineEntry>;
    list(filters: {
        periodId?: string;
        type?: TimelineEntryType;
    }): Promise<any[]>;
    remove(id: string, user: {
        id: string;
        role: UserRole;
    }): Promise<void>;
    download(id: string, user: {
        id: string;
        role: UserRole;
    }): Promise<{
        readStream: fs.ReadStream;
        fileName: string;
    }>;
}
