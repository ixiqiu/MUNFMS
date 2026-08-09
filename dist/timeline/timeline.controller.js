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
exports.TimelineController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const timeline_service_1 = require("./timeline.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const upload_util_1 = require("../common/upload.util");
const download_util_1 = require("../common/download.util");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const user_entity_1 = require("../entities/user.entity");
const timeline_entry_entity_1 = require("../entities/timeline-entry.entity");
let TimelineController = class TimelineController {
    constructor(timelineService) {
        this.timelineService = timelineService;
    }
    async list(periodId, type, user) {
        if (user.role === user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('管理员无权访问');
        }
        const entries = await this.timelineService.list({
            periodId: periodId || undefined,
            type: type === timeline_entry_entity_1.TimelineEntryType.SITUATION || type === timeline_entry_entity_1.TimelineEntryType.NEWS
                ? type
                : undefined,
        });
        return { entries };
    }
    async create(body, file, user) {
        if (user.role !== user_entity_1.UserRole.ACADEMIC) {
            throw new common_1.ForbiddenException('仅学术组可发布时间线');
        }
        if (body.type !== timeline_entry_entity_1.TimelineEntryType.SITUATION && body.type !== timeline_entry_entity_1.TimelineEntryType.NEWS) {
            throw new common_1.BadRequestException('无效的时间线类型');
        }
        const entry = await this.timelineService.create(user, body, file);
        return { entry };
    }
    async remove(id, user) {
        if (user.role !== user_entity_1.UserRole.ACADEMIC) {
            throw new common_1.ForbiddenException('仅学术组可发布时间线');
        }
        await this.timelineService.remove(id, user);
        return { message: '时间线条目已删除' };
    }
    async download(id, user, res) {
        const { readStream, fileName } = await this.timelineService.download(id, user);
        res.setHeader('Content-Type', (0, download_util_1.getMimeType)(fileName));
        (0, download_util_1.setContentDisposition)(res, fileName);
        return new common_1.StreamableFile(readStream);
    }
};
exports.TimelineController = TimelineController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('periodId')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], TimelineController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', (0, upload_util_1.createUploadOptions)('./uploads/temp', 50 * 1024 * 1024))),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], TimelineController.prototype, "create", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TimelineController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/download'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], TimelineController.prototype, "download", null);
exports.TimelineController = TimelineController = __decorate([
    (0, common_1.Controller)('timeline'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [timeline_service_1.TimelineService])
], TimelineController);
//# sourceMappingURL=timeline.controller.js.map