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
}
