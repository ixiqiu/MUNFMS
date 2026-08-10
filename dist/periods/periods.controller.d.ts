import { PeriodsService } from './periods.service';
import { UserRole } from '../entities/user.entity';
import { EventsService } from '../events/events.service';
export declare class PeriodsController {
    private readonly periodsService;
    private readonly eventsService;
    constructor(periodsService: PeriodsService, eventsService: EventsService);
    list(): Promise<{
        periods: import("../entities").ConferencePeriod[];
    }>;
    getCurrent(): Promise<{
        period: import("../entities").ConferencePeriod | null;
        clock: {
            simTimeBase: Date | null;
            baseRealTime: Date | null;
            flowRatio: number;
            isRunning: boolean;
        };
    }>;
    create(body: {
        number: number;
        name?: string;
    }, user: {
        id: string;
        role: UserRole;
        cabinetId: string | null;
    }): Promise<{
        period: import("../entities").ConferencePeriod;
    }>;
    setCurrent(body: {
        periodId: string;
    }, user: {
        id: string;
        role: UserRole;
        cabinetId: string | null;
    }): Promise<{
        period: import("../entities").ConferencePeriod;
    }>;
    setTime(body: {
        simTime: string;
        flowRatio: number;
    }, user: {
        id: string;
        role: UserRole;
        cabinetId: string | null;
    }): Promise<{
        clock: ReturnType<PeriodsService["getClock"]>;
    }>;
    pauseTime(user: {
        id: string;
        role: UserRole;
        cabinetId: string | null;
    }): Promise<{
        clock: ReturnType<PeriodsService["getClock"]>;
    }>;
    resumeTime(user: {
        id: string;
        role: UserRole;
        cabinetId: string | null;
    }): Promise<{
        clock: ReturnType<PeriodsService["getClock"]>;
    }>;
}
