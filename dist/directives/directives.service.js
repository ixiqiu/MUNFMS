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
exports.DirectivesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const directive_entity_1 = require("../entities/directive.entity");
const directive_type_entity_1 = require("../entities/directive-type.entity");
const global_state_entity_1 = require("../entities/global-state.entity");
const conference_period_entity_1 = require("../entities/conference-period.entity");
const file_entity_1 = require("../entities/file.entity");
const cabinet_entity_1 = require("../entities/cabinet.entity");
const user_entity_1 = require("../entities/user.entity");
const events_service_1 = require("../events/events.service");
const PRESET_TYPE_NAMES = ['外交指令', '内政指令', '情报指令', '舆情指令', '军事指令', '经济指令'];
let DirectivesService = class DirectivesService {
    constructor(directiveRepo, typeRepo, globalStateRepo, periodRepo, fileRepo, cabinetRepo, eventsService) {
        this.directiveRepo = directiveRepo;
        this.typeRepo = typeRepo;
        this.globalStateRepo = globalStateRepo;
        this.periodRepo = periodRepo;
        this.fileRepo = fileRepo;
        this.cabinetRepo = cabinetRepo;
        this.eventsService = eventsService;
        this.uploadBaseDir = path.join(process.cwd(), 'uploads', 'directive');
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
    async onModuleInit() {
        const count = await this.typeRepo.count();
        if (count > 0) {
            return;
        }
        await this.typeRepo.save(PRESET_TYPE_NAMES.map((name, index) => this.typeRepo.create({ name, isPreset: true, sortOrder: index })));
    }
    async getCurrentPeriod() {
        const state = await this.globalStateRepo.findOne({ where: { id: '1' } });
        if (!state?.currentPeriodId) {
            throw new common_1.BadRequestException('当前无会期，无法提交指令');
        }
        const period = await this.periodRepo.findOne({ where: { id: state.currentPeriodId } });
        if (!period) {
            throw new common_1.BadRequestException('当前会期不存在');
        }
        return period;
    }
    async persistFile(file, uploaderId) {
        const uniqueFileName = `${(0, uuid_1.v4)()}_${file.originalname}`;
        const destPath = path.join(this.uploadBaseDir, uniqueFileName);
        await fs.promises.rename(file.path, destPath);
        try {
            const fileEntity = this.fileRepo.create({
                fileName: file.originalname,
                storagePath: path.join('directive', uniqueFileName),
                spaceType: file_entity_1.SpaceType.DIRECTIVE,
                uploaderId,
                targetId: null,
                isFromConference: false,
            });
            return await this.fileRepo.save(fileEntity);
        }
        catch (error) {
            if (fs.existsSync(destPath)) {
                await fs.promises.unlink(destPath).catch(() => { });
            }
            throw error;
        }
    }
    async create(user, body, file) {
        if (user.role !== user_entity_1.UserRole.DELEGATE || !user.cabinetId) {
            throw new common_1.ForbiddenException('仅代表可提交指令');
        }
        if (!body.content || !body.content.trim()) {
            throw new common_1.BadRequestException('指令内容不能为空');
        }
        const type = await this.typeRepo.findOne({ where: { id: body.typeId } });
        if (!type) {
            throw new common_1.NotFoundException('指令类型不存在');
        }
        const period = await this.getCurrentPeriod();
        const maxRow = await this.directiveRepo
            .createQueryBuilder('d')
            .select('MAX(d.sequence)', 'max')
            .where('d.periodId = :periodId', { periodId: period.id })
            .andWhere('d.cabinetId = :cabinetId', { cabinetId: user.cabinetId })
            .andWhere('d.typeId = :typeId', { typeId: type.id })
            .getRawOne();
        const sequence = (maxRow?.max ?? 0) + 1;
        let savedFile = null;
        try {
            if (file) {
                savedFile = await this.persistFile(file, user.id);
            }
            const directive = this.directiveRepo.create({
                periodId: period.id,
                typeId: type.id,
                typeName: type.name,
                cabinetId: user.cabinetId,
                content: body.content.trim(),
                fileId: savedFile?.id ?? null,
                status: directive_entity_1.DirectiveStatus.PENDING,
                reply: null,
                replyFileId: null,
                sequence,
                reviewedAt: null,
                reviewerId: null,
            });
            const saved = await this.directiveRepo.save(directive);
            this.eventsService.emit({
                type: 'directive.new',
                targetId: user.cabinetId,
                actorId: user.id,
                ts: Date.now(),
            });
            return saved;
        }
        catch (error) {
            if (savedFile) {
                const fullPath = path.join(process.cwd(), 'uploads', savedFile.storagePath);
                if (fs.existsSync(fullPath)) {
                    await fs.promises.unlink(fullPath).catch(() => { });
                }
                await this.fileRepo.delete(savedFile.id).catch(() => { });
            }
            else if (file && fs.existsSync(file.path)) {
                await fs.promises.unlink(file.path).catch(() => { });
            }
            throw error;
        }
    }
    async list(user, query) {
        const qb = this.directiveRepo.createQueryBuilder('d');
        if (user.role === user_entity_1.UserRole.DELEGATE) {
            qb.where('d.cabinetId = :cabinetId', { cabinetId: user.cabinetId });
        }
        else if (user.role !== user_entity_1.UserRole.ACADEMIC) {
            throw new common_1.ForbiddenException('无权查看指令');
        }
        if (query.periodId) {
            qb.andWhere('d.periodId = :periodId', { periodId: query.periodId });
        }
        if (query.typeId) {
            qb.andWhere('d.typeId = :typeId', { typeId: query.typeId });
        }
        if (query.cabinetId && user.role === user_entity_1.UserRole.ACADEMIC) {
            qb.andWhere('d.cabinetId = :filterCabinetId', { filterCabinetId: query.cabinetId });
        }
        qb.orderBy('d.createdAt', 'DESC');
        const directives = await qb.getMany();
        const cabinetIds = [...new Set(directives.map((d) => d.cabinetId))];
        const cabinets = cabinetIds.length
            ? await this.cabinetRepo.find({ where: cabinetIds.map((id) => ({ id })) })
            : [];
        const cabinetNameMap = new Map(cabinets.map((c) => [c.id, c.name]));
        const fileIds = [
            ...new Set(directives
                .flatMap((d) => [d.fileId, d.replyFileId])
                .filter((id) => !!id)),
        ];
        const files = fileIds.length
            ? await this.fileRepo.find({ where: fileIds.map((id) => ({ id })) })
            : [];
        const fileMap = new Map(files.map((f) => [f.id, f]));
        const periodIds = [...new Set(directives.map((d) => d.periodId))];
        const periods = periodIds.length
            ? await this.periodRepo.find({ where: periodIds.map((id) => ({ id })) })
            : [];
        const periodNumberMap = new Map(periods.map((p) => [p.id, p.number]));
        return {
            directives: directives.map((d) => ({
                ...d,
                cabinetName: cabinetNameMap.get(d.cabinetId) ?? null,
                file: d.fileId && fileMap.has(d.fileId)
                    ? { id: d.fileId, fileName: fileMap.get(d.fileId).fileName }
                    : null,
                replyFile: d.replyFileId && fileMap.has(d.replyFileId)
                    ? { id: d.replyFileId, fileName: fileMap.get(d.replyFileId).fileName }
                    : null,
                period: periodNumberMap.has(d.periodId)
                    ? { number: periodNumberMap.get(d.periodId) }
                    : null,
            })),
        };
    }
    async remove(user, id) {
        const directive = await this.directiveRepo.findOne({ where: { id } });
        if (!directive) {
            throw new common_1.NotFoundException('指令不存在');
        }
        if (user.role !== user_entity_1.UserRole.DELEGATE || !user.cabinetId || directive.cabinetId !== user.cabinetId) {
            throw new common_1.ForbiddenException('仅可删除本内阁的指令');
        }
        if (directive.status !== directive_entity_1.DirectiveStatus.PENDING) {
            throw new common_1.BadRequestException('仅可删除等待审核的指令');
        }
        if (directive.fileId) {
            const file = await this.fileRepo.findOne({ where: { id: directive.fileId } });
            if (file) {
                const fullPath = path.join(process.cwd(), 'uploads', file.storagePath);
                if (fs.existsSync(fullPath)) {
                    await fs.promises.unlink(fullPath);
                }
                await this.fileRepo.delete(file.id);
            }
        }
        await this.directiveRepo.delete(id);
        this.eventsService.emit({
            type: 'directive.changed',
            targetId: directive.cabinetId,
            actorId: user.id,
            ts: Date.now(),
        });
    }
    async review(user, id, body, replyFile) {
        if (user.role !== user_entity_1.UserRole.ACADEMIC) {
            throw new common_1.ForbiddenException('仅学术组可审核指令');
        }
        const directive = await this.directiveRepo.findOne({ where: { id } });
        if (!directive) {
            throw new common_1.NotFoundException('指令不存在');
        }
        if (directive.status !== directive_entity_1.DirectiveStatus.PENDING) {
            throw new common_1.BadRequestException('该指令已审核，不可重复操作');
        }
        if (body.status !== directive_entity_1.DirectiveStatus.ACCEPTED && body.status !== directive_entity_1.DirectiveStatus.REJECTED) {
            throw new common_1.BadRequestException('无效的审核状态');
        }
        let savedFile = null;
        try {
            if (replyFile) {
                savedFile = await this.persistFile(replyFile, user.id);
            }
            directive.status = body.status;
            directive.reply = body.reply?.trim() ? body.reply.trim() : null;
            directive.replyFileId = savedFile?.id ?? null;
            directive.reviewedAt = new Date();
            directive.reviewerId = user.id;
            const saved = await this.directiveRepo.save(directive);
            this.eventsService.emit({
                type: 'directive.changed',
                targetId: directive.cabinetId,
                status: body.status,
                actorId: user.id,
                ts: Date.now(),
            });
            return saved;
        }
        catch (error) {
            if (savedFile) {
                const fullPath = path.join(process.cwd(), 'uploads', savedFile.storagePath);
                if (fs.existsSync(fullPath)) {
                    await fs.promises.unlink(fullPath).catch(() => { });
                }
                await this.fileRepo.delete(savedFile.id).catch(() => { });
            }
            else if (replyFile && fs.existsSync(replyFile.path)) {
                await fs.promises.unlink(replyFile.path).catch(() => { });
            }
            throw error;
        }
    }
    async getDownloadable(user, id, field) {
        const directive = await this.directiveRepo.findOne({ where: { id } });
        if (!directive) {
            throw new common_1.NotFoundException('指令不存在');
        }
        const canAccess = user.role === user_entity_1.UserRole.ACADEMIC ||
            (user.role === user_entity_1.UserRole.DELEGATE &&
                !!user.cabinetId &&
                directive.cabinetId === user.cabinetId);
        if (!canAccess) {
            throw new common_1.ForbiddenException('无权下载该文件');
        }
        const fileId = directive[field];
        if (!fileId) {
            throw new common_1.NotFoundException('指令没有附件');
        }
        const file = await this.fileRepo.findOne({ where: { id: fileId } });
        if (!file) {
            throw new common_1.NotFoundException('文件不存在');
        }
        const fullPath = path.join(process.cwd(), 'uploads', file.storagePath);
        if (!fs.existsSync(fullPath)) {
            throw new common_1.NotFoundException('物理文件不存在');
        }
        return { readStream: fs.createReadStream(fullPath), fileName: file.fileName };
    }
    async downloadAttachment(user, id) {
        return this.getDownloadable(user, id, 'fileId');
    }
    async downloadReply(user, id) {
        return this.getDownloadable(user, id, 'replyFileId');
    }
    async listTypes() {
        const types = await this.typeRepo.find({
            order: { sortOrder: 'ASC', name: 'ASC' },
        });
        return { types };
    }
    async createType(user, body) {
        const name = body.name?.trim() ?? '';
        if (!name) {
            throw new common_1.BadRequestException('类型名称不能为空');
        }
        const existing = await this.typeRepo.findOne({ where: { name } });
        if (existing) {
            throw new common_1.BadRequestException('该指令类型已存在');
        }
        const maxRow = await this.typeRepo
            .createQueryBuilder('t')
            .select('MAX(t.sortOrder)', 'max')
            .getRawOne();
        const type = this.typeRepo.create({
            name,
            isPreset: false,
            sortOrder: (maxRow?.max ?? -1) + 1,
        });
        const saved = await this.typeRepo.save(type);
        return { type: saved };
    }
    async deleteType(user, id) {
        const type = await this.typeRepo.findOne({ where: { id } });
        if (!type) {
            throw new common_1.NotFoundException('指令类型不存在');
        }
        await this.typeRepo.delete(id);
        return { message: '删除成功' };
    }
};
exports.DirectivesService = DirectivesService;
exports.DirectivesService = DirectivesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(directive_entity_1.Directive)),
    __param(1, (0, typeorm_1.InjectRepository)(directive_type_entity_1.DirectiveType)),
    __param(2, (0, typeorm_1.InjectRepository)(global_state_entity_1.GlobalState)),
    __param(3, (0, typeorm_1.InjectRepository)(conference_period_entity_1.ConferencePeriod)),
    __param(4, (0, typeorm_1.InjectRepository)(file_entity_1.FileEntity)),
    __param(5, (0, typeorm_1.InjectRepository)(cabinet_entity_1.Cabinet)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        events_service_1.EventsService])
], DirectivesService);
//# sourceMappingURL=directives.service.js.map