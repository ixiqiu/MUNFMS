"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../entities/user.entity");
const notification_setting_entity_1 = require("../entities/notification-setting.entity");
const user_session_dnd_entity_1 = require("../entities/user-session-dnd.entity");
const events_service_1 = require("../events/events.service");
const REPORT_STALE_MS = 90_000;
let NotificationsService = class NotificationsService {
    constructor(userRepo, settingRepo, dndRepo, eventsService) {
        this.userRepo = userRepo;
        this.settingRepo = settingRepo;
        this.dndRepo = dndRepo;
        this.eventsService = eventsService;
    }
    async ensureSettingRow(userId) {
        await this.settingRepo
            .createQueryBuilder()
            .insert()
            .into(notification_setting_entity_1.NotificationSetting)
            .values({ userId, enabled: true, createdAt: new Date(), updatedAt: new Date() })
            .orIgnore()
            .execute();
    }
    async getSettings(userId) {
        await this.ensureSettingRow(userId);
        const setting = await this.settingRepo.findOneOrFail({ where: { userId } });
        const dndRows = await this.dndRepo.find({ where: { userId } });
        return { enabled: setting.enabled, dndSessionIds: dndRows.map((r) => r.sessionId) };
    }
    async setEnabled(userId, enabled) {
        await this.ensureSettingRow(userId);
        await this.settingRepo.update({ userId }, { enabled });
        return { enabled };
    }
    async setDnd(userId, sessionId, muted) {
        const existing = await this.dndRepo.findOne({ where: { userId, sessionId } });
        if (muted && !existing) {
            await this.dndRepo
                .createQueryBuilder()
                .insert()
                .into(user_session_dnd_entity_1.UserSessionDnd)
                .values({ userId, sessionId, createdAt: new Date() })
                .orIgnore()
                .execute();
        }
        if (!muted && existing)
            await this.dndRepo.remove(existing);
        return { muted };
    }
    async reportPermission(userId, state) {
        await this.ensureSettingRow(userId);
        await this.settingRepo.update({ userId }, { lastPermission: state, lastPermissionAt: new Date() });
    }
    async reportConnectionMode(userId, mode) {
        await this.ensureSettingRow(userId);
        await this.settingRepo.update({ userId }, { reportedMode: mode, lastReportAt: new Date() });
    }
    async getOverview(q) {
        const users = await this.userRepo.find({
            where: { role: user_entity_1.UserRole.DELEGATE },
            relations: { cabinet: true },
            order: { name: 'ASC' },
        });
        const settings = await this.settingRepo.find({ where: { userId: (0, typeorm_2.In)(users.map((u) => u.id)) } });
        const map = new Map(settings.map((s) => [s.userId, s]));
        const now = Date.now();
        let rows = users.map((u) => {
            const s = map.get(u.id);
            const reportedPolling = s?.reportedMode === 'polling' && s.lastReportAt
                && now - s.lastReportAt.getTime() < REPORT_STALE_MS;
            let connectionStatus;
            if (this.eventsService.isConnected(u.id)) {
                connectionStatus = 'online';
            }
            else if (reportedPolling) {
                connectionStatus = 'polling';
            }
            else {
                connectionStatus = 'offline';
            }
            return {
                userId: u.id,
                name: u.name,
                cabinetName: u.cabinet?.name ?? '',
                enabled: s?.enabled ?? true,
                lastPermission: s?.lastPermission ?? null,
                lastPermissionAt: s?.lastPermissionAt ?? null,
                connectionStatus,
            };
        });
        if (q) {
            const kw = q.trim().toLowerCase();
            rows = rows.filter((r) => r.name.toLowerCase().includes(kw) || r.cabinetName.toLowerCase().includes(kw));
        }
        return { delegates: rows };
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(notification_setting_entity_1.NotificationSetting)),
    __param(2, (0, typeorm_1.InjectRepository)(user_session_dnd_entity_1.UserSessionDnd)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        events_service_1.EventsService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map