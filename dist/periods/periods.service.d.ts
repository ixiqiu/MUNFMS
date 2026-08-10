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
        clock: {
            simTimeBase: Date | null;
            baseRealTime: Date | null;
            flowRatio: number;
            isRunning: boolean;
        };
    }>;
    private getClock;
    create(body: {
        number: number;
        name?: string;
    }): Promise<{
        period: ConferencePeriod;
    }>;
    setCurrent(periodId: string, actorId: string): Promise<{
        period: ConferencePeriod;
    }>;
    setTime(body: {
        simTime: string;
        flowRatio: number;
    }, actorId: string): Promise<{
        clock: ReturnType<PeriodsService['getClock']>;
    }>;
    pauseTime(actorId: string): Promise<{
        clock: ReturnType<PeriodsService['getClock']>;
    }>;
    resumeTime(actorId: string): Promise<{
        clock: ReturnType<PeriodsService['getClock']>;
    }>;
}
