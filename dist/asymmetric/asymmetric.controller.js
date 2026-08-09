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
exports.AsymmetricController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const asymmetric_service_1 = require("./asymmetric.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const upload_util_1 = require("../common/upload.util");
const download_util_1 = require("../common/download.util");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let AsymmetricController = class AsymmetricController {
    constructor(asymmetricService) {
        this.asymmetricService = asymmetricService;
    }
    async getChannels(user) {
        const channels = await this.asymmetricService.channels(user);
        return { channels };
    }
    async getMessages(cabinetId, user) {
        const messages = await this.asymmetricService.messages(user, cabinetId);
        return { messages };
    }
    async sendMessage(file, body, user) {
        const message = await this.asymmetricService.send(user, body, file ?? null);
        return { message };
    }
    async downloadFile(id, user, res) {
        const { readStream, fileName } = await this.asymmetricService.download(id, user);
        res.setHeader('Content-Type', (0, download_util_1.getMimeType)(fileName));
        (0, download_util_1.setContentDisposition)(res, fileName);
        return new common_1.StreamableFile(readStream);
    }
};
exports.AsymmetricController = AsymmetricController;
__decorate([
    (0, common_1.Get)('channels'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AsymmetricController.prototype, "getChannels", null);
__decorate([
    (0, common_1.Get)('messages'),
    __param(0, (0, common_1.Query)('cabinetId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AsymmetricController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)('messages'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', (0, upload_util_1.createUploadOptions)('./uploads/temp', 50 * 1024 * 1024))),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AsymmetricController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)('messages/:id/download'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AsymmetricController.prototype, "downloadFile", null);
exports.AsymmetricController = AsymmetricController = __decorate([
    (0, common_1.Controller)('asymmetric'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [asymmetric_service_1.AsymmetricService])
], AsymmetricController);
//# sourceMappingURL=asymmetric.controller.js.map