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
exports.PeriodsController = void 0;
const common_1 = require("@nestjs/common");
const periods_service_1 = require("./periods.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const user_entity_1 = require("../entities/user.entity");
const events_service_1 = require("../events/events.service");
let PeriodsController = class PeriodsController {
    constructor(periodsService, eventsService) {
        this.periodsService = periodsService;
        this.eventsService = eventsService;
    }
    async list() {
        return this.periodsService.list();
    }
    async getCurrent() {
        return this.periodsService.getCurrent();
    }
    async create(body, user) {
        if (user.role !== user_entity_1.UserRole.ACADEMIC) {
            throw new common_1.ForbiddenException('仅学术组可管理会期');
        }
        return this.periodsService.create(body);
    }
    async setCurrent(body, user) {
        if (user.role !== user_entity_1.UserRole.ACADEMIC) {
            throw new common_1.ForbiddenException('仅学术组可管理会期');
        }
        return this.periodsService.setCurrent(body.periodId, user.id);
    }
    async setTime(body, user) {
        if (user.role !== user_entity_1.UserRole.ACADEMIC) {
            throw new common_1.ForbiddenException('仅学术组可管理会期');
        }
        return this.periodsService.setTime(body, user.id);
    }
    async pauseTime(user) {
        if (user.role !== user_entity_1.UserRole.ACADEMIC) {
            throw new common_1.ForbiddenException('仅学术组可管理会期');
        }
        return this.periodsService.pauseTime(user.id);
    }
    async resumeTime(user) {
        if (user.role !== user_entity_1.UserRole.ACADEMIC) {
            throw new common_1.ForbiddenException('仅学术组可管理会期');
        }
        return this.periodsService.resumeTime(user.id);
    }
};
exports.PeriodsController = PeriodsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PeriodsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('current'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PeriodsController.prototype, "getCurrent", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PeriodsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)('current'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PeriodsController.prototype, "setCurrent", null);
__decorate([
    (0, common_1.Put)('time'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PeriodsController.prototype, "setTime", null);
__decorate([
    (0, common_1.Put)('time/pause'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PeriodsController.prototype, "pauseTime", null);
__decorate([
    (0, common_1.Put)('time/resume'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PeriodsController.prototype, "resumeTime", null);
exports.PeriodsController = PeriodsController = __decorate([
    (0, common_1.Controller)('periods'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [periods_service_1.PeriodsService,
        events_service_1.EventsService])
], PeriodsController);
//# sourceMappingURL=periods.controller.js.map