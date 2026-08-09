"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelineService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const timeline_entry_entity_1 = require("../entities/timeline-entry.entity");
const global_state_entity_1 = require("../entities/global-state.entity");
const conference_period_entity_1 = require("../entities/conference-period.entity");
const file_entity_1 = require("../entities/file.entity");
const user_entity_1 = require("../entities/user.entity");
const events_service_1 = require("../events/events.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
let TimelineService = class TimelineService {
    constructor(entryRepo, globalStateRepo, periodRepo, fileRepo, eventsService) {
        this.entryRepo = entryRepo;
        this.globalStateRepo = globalStateRepo;
        this.periodRepo = periodRepo;
        this.fileRepo = fileRepo;
        this.eventsService = eventsService;
        this.uploadBaseDir = path.join(process.cwd(), 'uploads', 'timeline');
        this.ensureUploadDirs();
    }
    ensureUploadDirs() {
        if (!fs.existsSync(this.uploadBaseDir)) {
            fs.mkdirSync(this.uploadBaseDir, { recursive: true });
        }
        const tempDir = path.join(process.cwd(), 'uploads', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
    }
    async getCurrentPeriodId() {
        const state = await this.globalStateRepo.findOne({ where: { id: '1' } });
        if (!state?.currentPeriodId) {
            throw new common_1.BadRequestException('当前无会期，请先在会期管理设置当前会期');
        }
        return state.currentPeriodId;
    }
    async create(user, body, file) {
        const periodId = await this.getCurrentPeriodId();
        const content = body.content?.trim() || null;
        const newsSource = body.type === timeline_entry_entity_1.TimelineEntryType.NEWS ? body.newsSource?.trim() || null : null;
        if (!content && !file) {
            throw new common_1.BadRequestException('内容与附件至少填写一项');
        }
        const storageDir = this.uploadBaseDir;
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }
        let storagePath = null;
        try {
            let fileId = null;
            if (file) {
                const uniqueFileName = `${(0, uuid_1.v4)()}_${file.originalname}`;
                storagePath = path.join(storageDir, uniqueFileName);
                const relativePath = path.join('timeline', uniqueFileName);
                await fs.promises.rename(file.path, storagePath);
                const fileEntity = this.fileRepo.create({
                    fileName: file.originalname,
                    storagePath: relativePath,
                    spaceType: file_entity_1.SpaceType.TIMELINE,
                    uploaderId: user.id,
                    targetId: periodId,
                    isFromConference: false,
                });
                const savedFile = await this.fileRepo.save(fileEntity);
                fileId = savedFile.id;
            }
            const last = await this.entryRepo.findOne({
                where: { periodId, type: body.type },
                order: { sequence: 'DESC' },
            });
            const sequence = (last?.sequence ?? 0) + 1;
            const entry = this.entryRepo.create({
                periodId,
                type: body.type,
                newsSource,
                content,
                fileId,
                sequence,
            });
            const savedEntry = await this.entryRepo.save(entry);
            this.eventsService.emit({
                type: 'timeline.changed',
                targetId: periodId,
                entryType: savedEntry.type,
                actorId: user.id,
                ts: Date.now(),
            });
            return savedEntry;
        }
        catch (error) {
            if (storagePath && fs.existsSync(storagePath)) {
                await fs.promises.unlink(storagePath);
            }
            throw error;
        }
    }
    async list(filters) {
        const qb = this.entryRepo.createQueryBuilder('e');
        if (filters.periodId) {
            qb.andWhere('e.periodId = :periodId', { periodId: filters.periodId });
        }
        if (filters.type) {
            qb.andWhere('e.type = :type', { type: filters.type });
        }
        qb.orderBy('e.createdAt', 'DESC');
        const entries = await qb.getMany();
        const periodIds = [...new Set(entries.map((e) => e.periodId))];
        const periods = periodIds.length
            ? await this.periodRepo.find({
                where: periodIds.map((id) => ({ id })),
            })
            : [];
        const periodNumberMap = new Map(periods.map((p) => [p.id, p.number]));
        const fileIds = entries.map((e) => e.fileId).filter((id) => !!id);
        const files = fileIds.length
            ? await this.fileRepo.find({
                where: fileIds.map((id) => ({ id })),
            })
            : [];
        const fileMap = new Map(files.map((f) => [f.id, { id: f.id, fileName: f.fileName }]));
        return entries.map((e) => ({
            ...e,
            period: periodNumberMap.has(e.periodId)
                ? { number: periodNumberMap.get(e.periodId) }
                : null,
            file: e.fileId && fileMap.has(e.fileId) ? fileMap.get(e.fileId) : null,
        }));
    }
    async remove(id, user) {
        const entry = await this.entryRepo.findOne({ where: { id } });
        if (!entry) {
            throw new common_1.NotFoundException('时间线条目不存在');
        }
        if (entry.fileId) {
            const file = await this.fileRepo.findOne({ where: { id: entry.fileId } });
            if (file) {
                const fullPath = path.join(process.cwd(), 'uploads', file.storagePath);
                if (fs.existsSync(fullPath)) {
                    await fs.promises.unlink(fullPath);
                }
                await this.entryRepo.update(entry.id, { fileId: null });
                await this.fileRepo.delete(file.id);
            }
        }
        await this.entryRepo.delete(entry.id);
        this.eventsService.emit({
            type: 'timeline.changed',
            targetId: entry.periodId,
            entryType: entry.type,
            actorId: user.id,
            ts: Date.now(),
        });
    }
    async download(id, user) {
        const entry = await this.entryRepo.findOne({ where: { id } });
        if (!entry) {
            throw new common_1.NotFoundException('时间线条目不存在');
        }
        if (!entry.fileId) {
            throw new common_1.NotFoundException('该条目没有附件');
        }
        if (user.role === user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('管理员无权访问');
        }
        const file = await this.fileRepo.findOne({ where: { id: entry.fileId } });
        if (!file) {
            throw new common_1.NotFoundException('附件记录不存在');
        }
        const fullPath = path.join(process.cwd(), 'uploads', file.storagePath);
        if (!fs.existsSync(fullPath)) {
            throw new common_1.NotFoundException('物理文件不存在');
        }
        const readStream = fs.createReadStream(fullPath);
        return { readStream, fileName: file.fileName };
    }
};
exports.TimelineService = TimelineService;
exports.TimelineService = TimelineService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(timeline_entry_entity_1.TimelineEntry)),
    __param(1, (0, typeorm_1.InjectRepository)(global_state_entity_1.GlobalState)),
    __param(2, (0, typeorm_1.InjectRepository)(conference_period_entity_1.ConferencePeriod)),
    __param(3, (0, typeorm_1.InjectRepository)(file_entity_1.FileEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        events_service_1.EventsService])
], TimelineService);
//# sourceMappingURL=timeline.service.js.map