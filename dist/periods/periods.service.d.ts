import { Repository } from 'typeorm';
import { ConferencePeriod } from '../entities/conference-period.entity';
import { GlobalState } from '../entities/global-state.entity';
import { EventsService } from '../events/events.service';
export declare class PeriodsService {
    private readonly periodRepo;
    private readonly stateRepo;
    private readonly eventsService;
    constructor(periodRepo: Repository<ConferencePeriod>, stateRepo: Repository<GlobalState>, eventsService: EventsService);
    private ensureStateRow;
    list(): Promise<{
        periods: ConferencePeriod[];
    }>;
    getCurrent(): Promise<{
        period: ConferencePeriod | null;
    }>;
    create(body: {
        number: number;
        name?: string;
    }): Promise<{
        period: ConferencePeriod;
    }>;
    setCurrent(periodId: string, actorId: string): Promise<{
        period: ConferencePeriod;
    }>;
}
