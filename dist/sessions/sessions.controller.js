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
exports.SessionsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const sessions_service_1 = require("./sessions.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const upload_util_1 = require("../common/upload.util");
const download_util_1 = require("../common/download.util");
const user_entity_1 = require("../entities/user.entity");
const message_entity_1 = require("../entities/message.entity");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let SessionsController = class SessionsController {
    constructor(sessionsService) {
        this.sessionsService = sessionsService;
    }
    async getSessions(user) {
        const sessions = await this.sessionsService.getSessions(user.cabinetId, user.role);
        return { sessions };
    }
    async createGroupSession(body, user) {
        if (user.role === user_entity_1.UserRole.ACADEMIC || !user.cabinetId) {
            throw new common_1.BadRequestException('只有代表可以创建群聊');
        }
        const session = await this.sessionsService.createGroupSession(body.cabinetIds, body.name, user.cabinetId);
        return { session };
    }
    async renameSession(id, body, user) {
        const session = await this.sessionsService.renameSession(id, body.name, user.cabinetId, user.role);
        return { session };
    }
    async dissolveSession(id, user) {
        await this.sessionsService.dissolveSession(id, user.role);
        return { message: '群聊已解散' };
    }
    async leaveSession(id, user) {
        if (user.role === user_entity_1.UserRole.ACADEMIC || user.role === user_entity_1.UserRole.ADMIN) {
            throw new common_1.BadRequestException('学术组与管理员请使用解散群聊');
        }
        await this.sessionsService.leaveSession(id, user.cabinetId);
        return { message: '已退出群聊' };
    }
    async getMessages(id, user) {
        const messages = await this.sessionsService.getMessages(id, user.cabinetId, user.role);
        return { messages };
    }
    async sendMessage(id, file, content, user) {
        if (!file && !content?.trim()) {
            throw new common_1.BadRequestException('请发送文件或输入文字');
        }
        const sendAsAcademic = user.role === user_entity_1.UserRole.ACADEMIC || user.role === user_entity_1.UserRole.ADMIN;
        const message = await this.sessionsService.sendMessage(id, file ?? null, content?.trim() || null, sendAsAcademic ? null : user.cabinetId, sendAsAcademic ? message_entity_1.MessageSenderType.ACADEMIC : message_entity_1.MessageSenderType.CABINET, user.id, user.id, user.role);
        return { message };
    }
    async copyFromCabinet(id, body, user) {
        if (!body.fileId) {
            throw new common_1.BadRequestException('缺少 fileId');
        }
        const message = await this.sessionsService.copyFromCabinet(id, body.fileId, user);
        return { message };
    }
    async downloadFile(messageId, user, res) {
        const { readStream, fileName } = await this.sessionsService.downloadFile(messageId, user.cabinetId, user.role);
        res.setHeader('Content-Type', (0, download_util_1.getMimeType)(fileName));
        (0, download_util_1.setContentDisposition)(res, fileName);
        return new common_1.StreamableFile(readStream);
    }
};
exports.SessionsController = SessionsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "getSessions", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "createGroupSession", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "renameSession", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "dissolveSession", null);
__decorate([
    (0, common_1.Delete)(':id/members/me'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "leaveSession", null);
__decorate([
    (0, common_1.Get)(':id/messages'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)(':id/messages'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', (0, upload_util_1.createUploadOptions)('./uploads/temp'))),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('content')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)(':id/copy-file'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "copyFromCabinet", null);
__decorate([
    (0, common_1.Get)('messages/:messageId/download'),
    __param(0, (0, common_1.Param)('messageId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "downloadFile", null);
exports.SessionsController = SessionsController = __decorate([
    (0, common_1.Controller)('sessions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [sessions_service_1.SessionsService])
], SessionsController);
//# sourceMappingURL=sessions.controller.js.map