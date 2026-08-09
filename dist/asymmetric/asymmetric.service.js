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
exports.AsymmetricService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const asym_message_entity_1 = require("../entities/asym-message.entity");
const message_entity_1 = require("../entities/message.entity");
const file_entity_1 = require("../entities/file.entity");
const cabinet_entity_1 = require("../entities/cabinet.entity");
const user_entity_1 = require("../entities/user.entity");
const events_service_1 = require("../events/events.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
let AsymmetricService = class AsymmetricService {
    constructor(asymRepo, cabinetRepo, fileRepo, userRepo, eventsService) {
        this.asymRepo = asymRepo;
        this.cabinetRepo = cabinetRepo;
        this.fileRepo = fileRepo;
        this.userRepo = userRepo;
        this.eventsService = eventsService;
        this.uploadBaseDir = path.join(process.cwd(), 'uploads', 'asymmetric');
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
    async channels(user) {
        if (user.role === user_entity_1.UserRole.ACADEMIC) {
            const cabinets = await this.cabinetRepo.find({ order: { name: 'ASC' } });
            return Promise.all(cabinets.map((c) => this.buildChannel(c.id, c.name, true)));
        }
        if (!user.cabinetId) {
            return [];
        }
        const cabinet = await this.cabinetRepo.findOne({ where: { id: user.cabinetId } });
        if (!cabinet) {
            return [];
        }
        return [await this.buildChannel(cabinet.id, cabinet.name, false)];
    }
    async buildChannel(cabinetId, cabinetName, readerIsAcademic) {
        const lastMessage = await this.asymRepo.findOne({
            where: { cabinetId },
            order: { createdAt: 'DESC' },
        });
        const unreadCount = await this.asymRepo.count({
            where: {
                cabinetId,
                isRead: false,
                senderType: readerIsAcademic
                    ? message_entity_1.MessageSenderType.CABINET
                    : message_entity_1.MessageSenderType.ACADEMIC,
            },
        });
        return {
            cabinetId,
            cabinetName,
            lastMessageAt: lastMessage ? lastMessage.createdAt.toISOString() : null,
            unreadCount,
        };
    }
    async messages(user, cabinetId) {
        const isAcademic = user.role === user_entity_1.UserRole.ACADEMIC;
        let targetCabinetId;
        if (isAcademic) {
            if (!cabinetId) {
                throw new common_1.BadRequestException('缺少内阁参数');
            }
            const cabinet = await this.cabinetRepo.findOne({ where: { id: cabinetId } });
            if (!cabinet) {
                throw new common_1.NotFoundException('内阁不存在');
            }
            targetCabinetId = cabinetId;
        }
        else {
            if (cabinetId && cabinetId !== user.cabinetId) {
                throw new common_1.ForbiddenException('无权查看其他内阁的会话');
            }
            if (!user.cabinetId) {
                throw new common_1.BadRequestException('当前账号未绑定内阁');
            }
            targetCabinetId = user.cabinetId;
        }
        const messages = await this.asymRepo.find({
            where: { cabinetId: targetCabinetId },
            order: { createdAt: 'ASC' },
        });
        const oppositeType = isAcademic
            ? message_entity_1.MessageSenderType.CABINET
            : message_entity_1.MessageSenderType.ACADEMIC;
        const unreadIds = messages
            .filter((m) => !m.isRead && m.senderType === oppositeType)
            .map((m) => m.id);
        if (unreadIds.length > 0) {
            await this.asymRepo.update({ id: (0, typeorm_2.In)(unreadIds) }, { isRead: true });
        }
        const fileIds = messages
            .map((m) => m.fileId)
            .filter((id) => !!id);
        const files = fileIds.length
            ? await this.fileRepo.find({ where: fileIds.map((id) => ({ id })) })
            : [];
        const fileMap = new Map(files.map((f) => [f.id, f]));
        const senderIds = messages
            .map((m) => m.senderUserId)
            .filter((id) => !!id);
        const senders = senderIds.length
            ? await this.userRepo.find({
                where: [...new Set(senderIds)].map((id) => ({ id })),
                relations: ['cabinet'],
            })
            : [];
        const senderNameMap = new Map(senders.map((u) => [u.id, u.name]));
        const senderCabinetMap = new Map(senders.map((u) => [u.id, u.cabinet?.name ?? null]));
        const channelCabinet = await this.cabinetRepo.findOne({
            where: { id: targetCabinetId },
        });
        const channelCabinetName = channelCabinet?.name ?? null;
        return messages.map((m) => ({
            ...m,
            file: m.fileId
                ? { id: m.fileId, fileName: fileMap.get(m.fileId)?.fileName ?? null }
                : null,
            senderName: m.senderUserId ? senderNameMap.get(m.senderUserId) ?? null : null,
            senderCabinetName: m.senderType === message_entity_1.MessageSenderType.ACADEMIC
                ? '学术'
                : senderCabinetMap.get(m.senderUserId) ?? channelCabinetName,
        }));
    }
    async send(user, body, file) {
        if (!file && !body.content?.trim()) {
            throw new common_1.BadRequestException('内容与附件至少填写一项');
        }
        let targetCabinetId;
        if (user.role === user_entity_1.UserRole.ACADEMIC) {
            if (!body.cabinetId) {
                throw new common_1.BadRequestException('缺少内阁参数');
            }
            const cabinet = await this.cabinetRepo.findOne({ where: { id: body.cabinetId } });
            if (!cabinet) {
                throw new common_1.NotFoundException('内阁不存在');
            }
            targetCabinetId = body.cabinetId;
        }
        else {
            if (!user.cabinetId) {
                throw new common_1.BadRequestException('当前账号未绑定内阁');
            }
            targetCabinetId = user.cabinetId;
        }
        const senderType = user.role === user_entity_1.UserRole.ACADEMIC
            ? message_entity_1.MessageSenderType.ACADEMIC
            : message_entity_1.MessageSenderType.CABINET;
        if (!fs.existsSync(this.uploadBaseDir)) {
            fs.mkdirSync(this.uploadBaseDir, { recursive: true });
        }
        let storagePath = null;
        try {
            let fileId = null;
            if (file) {
                const uniqueFileName = `${(0, uuid_1.v4)()}_${file.originalname}`;
                storagePath = path.join(this.uploadBaseDir, uniqueFileName);
                const relativePath = path.join('asymmetric', uniqueFileName);
                await fs.promises.rename(file.path, storagePath);
                const fileEntity = this.fileRepo.create({
                    fileName: file.originalname,
                    storagePath: relativePath,
                    spaceType: file_entity_1.SpaceType.ASYMMETRIC,
                    uploaderId: user.id,
                    targetId: null,
                    isFromConference: false,
                });
                const savedFile = await this.fileRepo.save(fileEntity);
                fileId = savedFile.id;
            }
            const message = this.asymRepo.create({
                cabinetId: targetCabinetId,
                senderType,
                senderUserId: user.id,
                content: body.content?.trim() || null,
                fileId,
                isRead: false,
            });
            const savedMessage = await this.asymRepo.save(message);
            this.eventsService.emit({
                type: 'asym.message.new',
                targetId: targetCabinetId,
                senderType,
                actorId: user.id,
                ts: Date.now(),
            });
            return savedMessage;
        }
        catch (error) {
            if (storagePath && fs.existsSync(storagePath)) {
                await fs.promises.unlink(storagePath);
            }
            throw error;
        }
    }
    async download(id, user) {
        const message = await this.asymRepo.findOne({ where: { id } });
        if (!message) {
            throw new common_1.NotFoundException('消息不存在');
        }
        if (user.role !== user_entity_1.UserRole.ACADEMIC && message.cabinetId !== user.cabinetId) {
            throw new common_1.ForbiddenException('无权访问该文件');
        }
        if (!message.fileId) {
            throw new common_1.NotFoundException('消息没有附件');
        }
        const file = await this.fileRepo.findOne({ where: { id: message.fileId } });
        if (!file) {
            throw new common_1.NotFoundException('文件不存在');
        }
        const fullPath = path.join(process.cwd(), 'uploads', file.storagePath);
        if (!fs.existsSync(fullPath)) {
            throw new common_1.NotFoundException('物理文件不存在');
        }
        return { readStream: fs.createReadStream(fullPath), fileName: file.fileName };
    }
};
exports.AsymmetricService = AsymmetricService;
exports.AsymmetricService = AsymmetricService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(asym_message_entity_1.AsymMessage)),
    __param(1, (0, typeorm_1.InjectRepository)(cabinet_entity_1.Cabinet)),
    __param(2, (0, typeorm_1.InjectRepository)(file_entity_1.FileEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        events_service_1.EventsService])
], AsymmetricService);
//# sourceMappingURL=asymmetric.service.js.map