import { NotificationsService } from './notifications.service';
import { User } from '../entities/user.entity';
export declare class NotificationsController {
    private readonly service;
    constructor(service: NotificationsService);
    getSettings(user: User): Promise<{
        enabled: boolean;
        dndSessionIds: string[];
    }>;
    setSettings(user: User, body: {
        enabled: boolean;
    }): Promise<{
        enabled: boolean;
    }>;
    setDnd(user: User, sessionId: string, body: {
        muted: boolean;
    }): Promise<{
        muted: boolean;
    }>;
    reportPermission(user: User, body: {
        state: string;
    }): Promise<{
        ok: boolean;
    }>;
    reportConnectionMode(user: User, body: {
        mode: string;
    }): Promise<{
        ok: boolean;
    }>;
    getOverview(user: User, q?: string): Promise<{
        delegates: import("./notifications.service").OverviewRow[];
    }>;
}
