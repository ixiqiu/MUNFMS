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
exports.DirectivesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const directives_service_1 = require("./directives.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const admin_guard_1 = require("../common/guards/admin.guard");
const upload_util_1 = require("../common/upload.util");
const download_util_1 = require("../common/download.util");
let DirectivesController = class DirectivesController {
    constructor(directivesService) {
        this.directivesService = directivesService;
    }
    async listTypes() {
        return this.directivesService.listTypes();
    }
    async createType(body, user) {
        return this.directivesService.createType(user, body);
    }
    async deleteType(id, user) {
        return this.directivesService.deleteType(user, id);
    }
    async list(query, user) {
        return this.directivesService.list(user, query);
    }
    async create(file, body, user) {
        return this.directivesService.create(user, body, file ?? null);
    }
    async remove(id, user) {
        await this.directivesService.remove(user, id);
        return { message: '删除成功' };
    }
    async review(id, file, body, user) {
        return this.directivesService.review(user, id, body, file ?? null);
    }
    async downloadAttachment(id, user, res) {
        const { readStream, fileName } = await this.directivesService.downloadAttachment(user, id);
        res.setHeader('Content-Type', (0, download_util_1.getMimeType)(fileName));
        (0, download_util_1.setContentDisposition)(res, fileName);
        return new common_1.StreamableFile(readStream);
    }
    async downloadReply(id, user, res) {
        const { readStream, fileName } = await this.directivesService.downloadReply(user, id);
        res.setHeader('Content-Type', (0, download_util_1.getMimeType)(fileName));
        (0, download_util_1.setContentDisposition)(res, fileName);
        return new common_1.StreamableFile(readStream);
    }
};
exports.DirectivesController = DirectivesController;
__decorate([
    (0, common_1.Get)('types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DirectivesController.prototype, "listTypes", null);
__decorate([
    (0, common_1.Post)('types'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DirectivesController.prototype, "createType", null);
__decorate([
    (0, common_1.Delete)('types/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DirectivesController.prototype, "deleteType", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DirectivesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', (0, upload_util_1.createUploadOptions)('./uploads/temp', 50 * 1024 * 1024))),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], DirectivesController.prototype, "create", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DirectivesController.prototype, "remove", null);
__decorate([
    (0, common_1.Put)(':id/review'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', (0, upload_util_1.createUploadOptions)('./uploads/temp', 50 * 1024 * 1024))),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], DirectivesController.prototype, "review", null);
__decorate([
    (0, common_1.Get)(':id/download'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DirectivesController.prototype, "downloadAttachment", null);
__decorate([
    (0, common_1.Get)(':id/download-reply'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DirectivesController.prototype, "downloadReply", null);
exports.DirectivesController = DirectivesController = __decorate([
    (0, common_1.Controller)('directives'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [directives_service_1.DirectivesService])
], DirectivesController);
//# sourceMappingURL=directives.controller.js.map