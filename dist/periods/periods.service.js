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
exports.PeriodsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const conference_period_entity_1 = require("../entities/conference-period.entity");
const global_state_entity_1 = require("../entities/global-state.entity");
const events_service_1 = require("../events/events.service");
let PeriodsService = class PeriodsService {
    constructor(periodRepo, stateRepo, eventsService) {
        this.periodRepo = periodRepo;
        this.stateRepo = stateRepo;
        this.eventsService = eventsService;
    }
    async ensureStateRow() {
        await this.stateRepo
            .createQueryBuilder()
            .insert()
            .into(global_state_entity_1.GlobalState)
            .values({ id: '1', currentPeriodId: null, updatedAt: new Date() })
            .orIgnore()
            .execute();
    }
    async list() {
        const periods = await this.periodRepo.find({ order: { number: 'ASC' } });
        return { periods };
    }
    async getCurrent() {
        await this.ensureStateRow();
        const state = await this.stateRepo.findOneByOrFail({ id: '1' });
        if (!state.currentPeriodId) {
            return { period: null };
        }
        const period = await this.periodRepo.findOneBy({ id: state.currentPeriodId });
        return { period: period ?? null };
    }
    async create(body) {
        if (!Number.isInteger(body.number) || body.number <= 0) {
            throw new common_1.BadRequestException('会期编号必须为正整数');
        }
        const existing = await this.periodRepo.findOneBy({ number: body.number });
        if (existing) {
            return { period: existing };
        }
        const period = await this.periodRepo.save(this.periodRepo.create({
            number: body.number,
            name: body.name?.trim() || null,
        }));
        return { period };
    }
    async setCurrent(periodId, actorId) {
        const period = await this.periodRepo.findOneBy({ id: periodId });
        if (!period) {
            throw new common_1.NotFoundException('会期不存在');
        }
        await this.ensureStateRow();
        await this.stateRepo.update({ id: '1' }, { currentPeriodId: periodId });
        this.eventsService.emit({
            type: 'period.changed',
            targetId: periodId,
            actorId,
            ts: Date.now(),
        });
        return { period };
    }
};
exports.PeriodsService = PeriodsService;
exports.PeriodsService = PeriodsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(conference_period_entity_1.ConferencePeriod)),
    __param(1, (0, typeorm_1.InjectRepository)(global_state_entity_1.GlobalState)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        events_service_1.EventsService])
], PeriodsService);
//# sourceMappingURL=periods.service.js.map