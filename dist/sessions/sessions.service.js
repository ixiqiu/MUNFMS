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
exports.SessionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const session_entity_1 = require("../entities/session.entity");
const session_member_entity_1 = require("../entities/session-member.entity");
const message_entity_1 = require("../entities/message.entity");
const file_entity_1 = require("../entities/file.entity");
const cabinet_entity_1 = require("../entities/cabinet.entity");
const user_entity_1 = require("../entities/user.entity");
const events_service_1 = require("../events/events.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
let SessionsService = class SessionsService {
    constructor(sessionRepo, sessionMemberRepo, messageRepo, fileRepo, cabinetRepo, userRepo, eventsService) {
        this.sessionRepo = sessionRepo;
        this.sessionMemberRepo = sessionMemberRepo;
        this.messageRepo = messageRepo;
        this.fileRepo = fileRepo;
        this.cabinetRepo = cabinetRepo;
        this.userRepo = userRepo;
        this.eventsService = eventsService;
        this.uploadBaseDir = path.join(process.cwd(), 'uploads', 'consult');
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
    async isMember(sessionId, cabinetId) {
        const member = await this.sessionMemberRepo.findOne({
            where: { sessionId, cabinetId },
        });
        return !!member;
    }
    hasFullSessionAccess(role) {
        return role === user_entity_1.UserRole.ACADEMIC || role === user_entity_1.UserRole.ADMIN;
    }
    async migrateLegacySessions() {
        const legacySessions = await this.sessionRepo
            .createQueryBuilder('s')
            .where('s.cabinetA_id IS NOT NULL')
            .getMany();
        for (const session of legacySessions) {
            const memberCount = await this.sessionMemberRepo.count({
                where: { sessionId: session.id },
            });
            if (memberCount > 0) {
                continue;
            }
            const ids = [session.cabinetA_id, session.cabinetB_id].filter((id) => !!id);
            if (ids.length > 0) {
                await this.sessionMemberRepo.save(ids.map((cabinetId) => ({ sessionId: session.id, cabinetId })));
            }
        }
    }
    async createGroupSession(cabinetIds, name, creatorCabinetId) {
        const uniqueIds = [...new Set([...cabinetIds, creatorCabinetId])];
        if (uniqueIds.length < 2) {
            throw new common_1.BadRequestException('群聊至少需要 2 个内阁');
        }
        const cabinets = await this.cabinetRepo.find({
            where: uniqueIds.map((id) => ({ id })),
        });
        if (cabinets.length !== uniqueIds.length) {
            throw new common_1.BadRequestException('存在无效的内阁');
        }
        const sortedIds = [...uniqueIds].sort();
        const firstCabinetId = sortedIds[0];
        const candidates = await this.sessionMemberRepo.find({
            where: { cabinetId: firstCabinetId },
        });
        for (const candidate of candidates) {
            const members = await this.sessionMemberRepo.find({
                where: { sessionId: candidate.sessionId },
            });
            const memberIds = members.map((m) => m.cabinetId).sort();
            if (memberIds.length === sortedIds.length &&
                memberIds.every((id, i) => id === sortedIds[i])) {
                return this.sessionRepo.findOne({ where: { id: candidate.sessionId } });
            }
        }
        const session = await this.sessionRepo.save(this.sessionRepo.create({
            name: name || cabinets.map((c) => c.name).join(' · '),
            lastMessageTime: null,
        }));
        await this.sessionMemberRepo.save(uniqueIds.map((cabinetId) => ({ sessionId: session.id, cabinetId })));
        this.eventsService.emit({ type: 'session.changed', ts: Date.now() });
        return session;
    }
    async renameSession(sessionId, name, cabinetId, role) {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
        if (!session) {
            throw new common_1.NotFoundException('群聊不存在');
        }
        if (!this.hasFullSessionAccess(role) && !(await this.isMember(sessionId, cabinetId))) {
            throw new common_1.ForbiddenException('无权操作该群聊');
        }
        session.name = name;
        const savedSession = await this.sessionRepo.save(session);
        this.eventsService.emit({ type: 'session.changed', ts: Date.now() });
        return savedSession;
    }
    async dissolveSession(sessionId, role) {
        if (!this.hasFullSessionAccess(role)) {
            throw new common_1.ForbiddenException('只有学术组可以解散群聊，代表请使用退出群聊');
        }
        const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
        if (!session) {
            throw new common_1.NotFoundException('群聊不存在');
        }
        await this.deleteSessionContent(sessionId);
        this.eventsService.emit({ type: 'session.changed', ts: Date.now() });
    }
    async leaveSession(sessionId, cabinetId) {
        if (!(await this.isMember(sessionId, cabinetId))) {
            throw new common_1.ForbiddenException('你不在该群聊中');
        }
        await this.sessionMemberRepo.delete({ sessionId, cabinetId });
        this.eventsService.emit({ type: 'session.changed', ts: Date.now() });
    }
    async deleteSessionContent(sessionId) {
        const messages = await this.messageRepo.find({ where: { sessionId } });
        const messageFileIds = messages.map((m) => m.fileId).filter((id) => !!id);
        await this.messageRepo.delete({ sessionId });
        if (messageFileIds.length > 0) {
            const files = await this.fileRepo.find({
                where: messageFileIds.map((id) => ({ id })),
            });
            for (const file of files) {
                const fullPath = path.join(process.cwd(), 'uploads', file.storagePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            }
            await this.fileRepo.delete(messageFileIds.map((id) => ({ id })));
        }
        await this.sessionMemberRepo.delete({ sessionId });
        await this.sessionRepo.delete({ id: sessionId });
    }
    async getSessions(cabinetId, role) {
        let sessions;
        if (this.hasFullSessionAccess(role)) {
            sessions = await this.sessionRepo.find({
                order: { lastMessageTime: 'DESC' },
            });
        }
        else {
            const memberships = await this.sessionMemberRepo.find({
                where: { cabinetId },
            });
            if (memberships.length === 0) {
                return [];
            }
            sessions = await this.sessionRepo.find({
                where: memberships.map((m) => ({ id: m.sessionId })),
                order: { lastMessageTime: 'DESC' },
            });
        }
        const result = [];
        for (const session of sessions) {
            const unreadCount = await this.countUnread(session.id, cabinetId, role);
            const members = await this.sessionMemberRepo.find({
                where: { sessionId: session.id },
            });
            const cabinets = await this.cabinetRepo.find({
                where: members.map((m) => ({ id: m.cabinetId })),
            });
            result.push({
                id: session.id,
                name: session.name,
                lastMessageTime: session.lastMessageTime,
                members: cabinets.map((c) => ({ id: c.id, name: c.name, type: c.type })),
                unreadCount,
            });
        }
        return result;
    }
    async countUnread(sessionId, cabinetId, role) {
        const qb = this.messageRepo
            .createQueryBuilder('m')
            .where('m.sessionId = :sessionId', { sessionId })
            .andWhere('m.isRead = 0');
        if (this.hasFullSessionAccess(role)) {
            qb.andWhere("m.senderType != 'ACADEMIC'");
        }
        else {
            qb.andWhere("NOT (m.senderType = 'CABINET' AND m.senderCabinetId = :cabinetId)", { cabinetId });
        }
        return qb.getCount();
    }
    async getMessages(sessionId, cabinetId, role) {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
        if (!session) {
            throw new common_1.NotFoundException('群聊不存在');
        }
        if (!this.hasFullSessionAccess(role) && !(await this.isMember(sessionId, cabinetId))) {
            throw new common_1.ForbiddenException('无权访问该群聊');
        }
        const messages = await this.messageRepo.find({
            where: { sessionId },
            relations: ['file'],
            order: { createdAt: 'ASC' },
        });
        const messagesToUpdate = messages.filter((m) => {
            if (m.isRead) {
                return false;
            }
            if (this.hasFullSessionAccess(role)) {
                return m.senderType !== message_entity_1.MessageSenderType.ACADEMIC;
            }
            return !(m.senderType === message_entity_1.MessageSenderType.CABINET &&
                m.senderCabinetId === cabinetId);
        });
        if (messagesToUpdate.length > 0) {
            await this.messageRepo.update({ id: (0, typeorm_2.In)(messagesToUpdate.map((m) => m.id)) }, { isRead: true });
        }
        const senderIds = messages
            .filter((m) => m.senderCabinetId)
            .map((m) => m.senderCabinetId);
        const senders = senderIds.length
            ? await this.cabinetRepo.find({
                where: [...new Set(senderIds)].map((id) => ({ id })),
            })
            : [];
        const senderNameMap = new Map(senders.map((c) => [c.id, c.name]));
        const academicUploaderIds = messages
            .filter((m) => m.senderType === message_entity_1.MessageSenderType.ACADEMIC)
            .map((m) => m.file?.uploaderId);
        const academicUsers = academicUploaderIds.length
            ? await this.userRepo.find({
                where: [...new Set(academicUploaderIds)].map((id) => ({ id })),
                relations: ['cabinet'],
            })
            : [];
        const academicNameMap = new Map(academicUsers.map((u) => [u.id, u.cabinet?.name]));
        const uploaderIds = messages
            .map((m) => m.senderUserId ?? m.file?.uploaderId)
            .filter((id) => !!id);
        const uploaderUsers = uploaderIds.length
            ? await this.userRepo.find({
                where: [...new Set(uploaderIds)].map((id) => ({ id })),
                relations: ['cabinet'],
            })
            : [];
        const uploaderNameMap = new Map(uploaderUsers.map((u) => [u.id, u.name]));
        const uploaderCabinetNameMap = new Map(uploaderUsers.map((u) => [u.id, u.cabinet?.name ?? null]));
        return messages.map((m) => {
            const uploaderId = m.senderUserId ?? m.file?.uploaderId ?? null;
            return {
                ...m,
                senderName: m.senderType === message_entity_1.MessageSenderType.ACADEMIC
                    ? academicNameMap.get(m.file?.uploaderId) || '学团'
                    : senderNameMap.get(m.senderCabinetId) || '未知',
                uploaderName: uploaderId ? uploaderNameMap.get(uploaderId) ?? null : null,
                uploaderCabinetName: uploaderId
                    ? uploaderCabinetNameMap.get(uploaderId) ?? null
                    : null,
            };
        });
    }
    async sendMessage(sessionId, file, content, senderCabinetId, senderType, uploaderId, senderUserId, role) {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
        if (!session) {
            throw new common_1.NotFoundException('群聊不存在');
        }
        if (!this.hasFullSessionAccess(role) &&
            !(await this.isMember(sessionId, senderCabinetId))) {
            throw new common_1.ForbiddenException('无权向该群聊发送消息');
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
                const relativePath = path.join('consult', uniqueFileName);
                await fs.promises.rename(file.path, storagePath);
                const fileEntity = this.fileRepo.create({
                    fileName: file.originalname,
                    storagePath: relativePath,
                    spaceType: file_entity_1.SpaceType.CONSULT,
                    uploaderId,
                    targetId: null,
                    isFromConference: false,
                });
                const savedFile = await this.fileRepo.save(fileEntity);
                fileId = savedFile.id;
            }
            const message = this.messageRepo.create({
                sessionId,
                senderCabinetId,
                senderType,
                fileId,
                content,
                senderUserId,
                isRead: false,
            });
            const savedMessage = await this.messageRepo.save(message);
            session.lastMessageTime = new Date();
            await this.sessionRepo.save(session);
            this.eventsService.emit({
                type: 'message.new',
                sessionId,
                actorId: uploaderId,
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
    async copyFromCabinet(sessionId, fileId, user) {
        if (user.role !== user_entity_1.UserRole.DELEGATE || !user.cabinetId) {
            throw new common_1.BadRequestException('只有代表可以复制内阁文件');
        }
        const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
        if (!session) {
            throw new common_1.NotFoundException('群聊不存在');
        }
        if (!(await this.isMember(sessionId, user.cabinetId))) {
            throw new common_1.ForbiddenException('无权向该群聊发送消息');
        }
        const file = await this.fileRepo.findOne({ where: { id: fileId } });
        if (!file) {
            throw new common_1.NotFoundException('文件不存在');
        }
        if (file.spaceType !== file_entity_1.SpaceType.CABINET || file.targetId !== user.cabinetId) {
            throw new common_1.ForbiddenException('只能复制本内阁的文件');
        }
        const srcPath = path.join(process.cwd(), 'uploads', file.storagePath);
        if (!fs.existsSync(srcPath)) {
            throw new common_1.NotFoundException('原文件不存在');
        }
        const destDir = path.join(process.cwd(), 'uploads', 'consult');
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        const uniqueFileName = `${(0, uuid_1.v4)()}_${file.fileName}`;
        const destPath = path.join(destDir, uniqueFileName);
        try {
            await fs.promises.copyFile(srcPath, destPath);
            const fileEntity = this.fileRepo.create({
                fileName: file.fileName,
                storagePath: path.join('consult', uniqueFileName),
                spaceType: file_entity_1.SpaceType.CONSULT,
                uploaderId: user.id,
                targetId: null,
                isFromConference: false,
            });
            const savedFile = await this.fileRepo.save(fileEntity);
            const message = this.messageRepo.create({
                sessionId,
                senderCabinetId: user.cabinetId,
                senderType: message_entity_1.MessageSenderType.CABINET,
                fileId: savedFile.id,
                content: null,
                senderUserId: user.id,
                isRead: false,
            });
            const savedMessage = await this.messageRepo.save(message);
            session.lastMessageTime = new Date();
            await this.sessionRepo.save(session);
            this.eventsService.emit({
                type: 'message.new',
                sessionId,
                actorId: user.id,
                ts: Date.now(),
            });
            return savedMessage;
        }
        catch (error) {
            if (fs.existsSync(destPath)) {
                await fs.promises.unlink(destPath);
            }
            throw error;
        }
    }
    async downloadFile(messageId, cabinetId, role) {
        const message = await this.messageRepo.findOne({
            where: { id: messageId },
            relations: ['file'],
        });
        if (!message) {
            throw new common_1.NotFoundException('消息不存在');
        }
        if (!this.hasFullSessionAccess(role) &&
            !(await this.isMember(message.sessionId, cabinetId))) {
            throw new common_1.ForbiddenException('无权访问该文件');
        }
        if (!message.file) {
            throw new common_1.NotFoundException('消息没有附件');
        }
        const mimeTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.bmp': 'image/bmp',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/msword',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.ms-excel',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.ms-powerpoint',
            '.txt': 'text/plain',
            '.zip': 'application/zip',
        };
        const fullPath = path.join(process.cwd(), 'uploads', message.file.storagePath);
        if (!fs.existsSync(fullPath)) {
            throw new common_1.NotFoundException('物理文件不存在');
        }
        const ext = path.extname(message.file.fileName).toLowerCase();
        const mimeType = mimeTypes[ext] ?? 'application/octet-stream';
        const readStream = fs.createReadStream(fullPath);
        return { readStream, fileName: message.file.fileName, mimeType };
    }
};
exports.SessionsService = SessionsService;
exports.SessionsService = SessionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(session_entity_1.Session)),
    __param(1, (0, typeorm_1.InjectRepository)(session_member_entity_1.SessionMember)),
    __param(2, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __param(3, (0, typeorm_1.InjectRepository)(file_entity_1.FileEntity)),
    __param(4, (0, typeorm_1.InjectRepository)(cabinet_entity_1.Cabinet)),
    __param(5, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        events_service_1.EventsService])
], SessionsService);
//# sourceMappingURL=sessions.service.js.map