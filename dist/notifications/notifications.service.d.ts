import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { NotificationSetting } from '../entities/notification-setting.entity';
import { UserSessionDnd } from '../entities/user-session-dnd.entity';
import { EventsService } from '../events/events.service';
export type ConnectionStatus = 'online' | 'polling' | 'offline';
export interface OverviewRow {
    userId: string;
    name: string;
    cabinetName: string;
    enabled: boolean;
    lastPermission: string | null;
    lastPermissionAt: Date | null;
    connectionStatus: ConnectionStatus;
}
export declare class NotificationsService {
    private readonly userRepo;
    private readonly settingRepo;
    private readonly dndRepo;
    private readonly eventsService;
    constructor(userRepo: Repository<User>, settingRepo: Repository<NotificationSetting>, dndRepo: Repository<UserSessionDnd>, eventsService: EventsService);
    private ensureSettingRow;
    getSettings(userId: string): Promise<{
        enabled: boolean;
        dndSessionIds: string[];
    }>;
    setEnabled(userId: string, enabled: boolean): Promise<{
        enabled: boolean;
    }>;
    setDnd(userId: string, sessionId: string, muted: boolean): Promise<{
        muted: boolean;
    }>;
    reportPermission(userId: string, state: string): Promise<void>;
    reportConnectionMode(userId: string, mode: string): Promise<void>;
    getOverview(q?: string): Promise<{
        delegates: OverviewRow[];
    }>;
}
