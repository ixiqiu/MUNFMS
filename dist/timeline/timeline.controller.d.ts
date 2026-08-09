import { StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { TimelineService } from './timeline.service';
import { UserRole } from '../entities/user.entity';
import { TimelineEntryType } from '../entities/timeline-entry.entity';
export declare class TimelineController {
    private readonly timelineService;
    constructor(timelineService: TimelineService);
    list(periodId: string | undefined, type: string | undefined, user: {
        id: string;
        role: UserRole;
    }): Promise<{
        entries: any[];
    }>;
    create(body: {
        type: TimelineEntryType;
        newsSource?: string;
        content?: string;
    }, file: Express.Multer.File | undefined, user: {
        id: string;
        role: UserRole;
    }): Promise<{
        entry: import("../entities/timeline-entry.entity").TimelineEntry;
    }>;
    remove(id: string, user: {
        id: string;
        role: UserRole;
    }): Promise<{
        message: string;
    }>;
    download(id: string, user: {
        id: string;
        role: UserRole;
    }, res: Response): Promise<StreamableFile>;
}
