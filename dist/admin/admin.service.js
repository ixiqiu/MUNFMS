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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const user_entity_1 = require("../entities/user.entity");
const cabinet_entity_1 = require("../entities/cabinet.entity");
const file_entity_1 = require("../entities/file.entity");
const session_entity_1 = require("../entities/session.entity");
const message_entity_1 = require("../entities/message.entity");
let AdminService = class AdminService {
    constructor(userRepo, cabinetRepo, fileRepo, sessionRepo, messageRepo) {
        this.userRepo = userRepo;
        this.cabinetRepo = cabinetRepo;
        this.fileRepo = fileRepo;
        this.sessionRepo = sessionRepo;
        this.messageRepo = messageRepo;
        this.uploadBaseDir = path.join(process.cwd(), 'uploads');
    }
    async seedAdmin() {
        const existing = await this.userRepo.findOne({ where: { role: user_entity_1.UserRole.ADMIN } });
        if (existing) {
            return null;
        }
        const passwordHash = await bcrypt.hash('admin123', 10);
        const admin = this.userRepo.create({
            name: 'admin',
            passwordHash,
            role: user_entity_1.UserRole.ADMIN,
            cabinet: null,
            cabinetId: null,
        });
        return this.userRepo.save(admin);
    }
    async listUsers() {
        const users = await this.userRepo.find({
            relations: ['cabinet'],
            order: { createdAt: 'DESC' },
        });
        return users.map((u) => ({
            id: u.id,
            name: u.name,
            role: u.role,
            cabinetId: u.cabinetId,
            cabinet: u.cabinet
                ? { id: u.cabinet.id, name: u.cabinet.name, type: u.cabinet.type }
                : null,
            createdAt: u.createdAt,
        }));
    }
    async createUser(payload) {
        if (payload.role === user_entity_1.UserRole.ADMIN) {
            throw new common_1.BadRequestException('请直接使用系统引导创建管理员');
        }
        if (!Object.values(user_entity_1.UserRole).includes(payload.role)) {
            throw new common_1.BadRequestException('无效的用户角色');
        }
        const existing = await this.userRepo.findOne({ where: { name: payload.name } });
        if (existing) {
            throw new common_1.BadRequestException('用户名已存在');
        }
        let cabinet = null;
        if (payload.cabinetId) {
            cabinet = await this.cabinetRepo.findOne({ where: { id: payload.cabinetId } });
            if (!cabinet) {
                throw new common_1.BadRequestException('所选内阁不存在');
            }
        }
        const passwordHash = await bcrypt.hash(payload.password, 10);
        const user = this.userRepo.create({
            name: payload.name,
            passwordHash,
            role: payload.role,
            cabinet,
            cabinetId: cabinet?.id ?? null,
        });
        const saved = await this.userRepo.save(user);
        const { passwordHash: _passwordHash, ...safeUser } = saved;
        return safeUser;
    }
    async changePassword(userId, newPassword) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('用户不存在');
        }
        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await this.userRepo.save(user);
    }
    async deleteUser(userId, operatorId) {
        if (userId === operatorId) {
            throw new common_1.BadRequestException('不能删除当前登录的账户');
        }
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('用户不存在');
        }
        if (user.role === user_entity_1.UserRole.ADMIN) {
            throw new common_1.BadRequestException('不能删除管理员账户');
        }
        await this.userRepo.delete(userId);
    }
    async createCabinet(payload) {
        if (!Object.values(cabinet_entity_1.CabinetType).includes(payload.type)) {
            throw new common_1.BadRequestException('无效的内阁类型');
        }
        const existing = await this.cabinetRepo.findOne({ where: { name: payload.name } });
        if (existing) {
            throw new common_1.BadRequestException('内阁名称已存在');
        }
        const cabinet = this.cabinetRepo.create({
            name: payload.name,
            type: payload.type,
        });
        return this.cabinetRepo.save(cabinet);
    }
    async deleteCabinet(cabinetId) {
        const cabinet = await this.cabinetRepo.findOne({ where: { id: cabinetId } });
        if (!cabinet) {
            throw new common_1.NotFoundException('内阁不存在');
        }
        const files = await this.fileRepo.find({ where: { targetId: cabinetId } });
        const sessions = await this.sessionRepo.find({
            where: [{ cabinetA_id: cabinetId }, { cabinetB_id: cabinetId }],
        });
        const sessionIds = sessions.map((s) => s.id);
        let messages = [];
        if (sessionIds.length > 0) {
            messages = await this.messageRepo
                .createQueryBuilder('m')
                .where('m.sessionId IN (:...ids)', { ids: sessionIds })
                .getMany();
        }
        const messageFileIds = new Set(messages.map((m) => m.fileId));
        const messageFiles = await this.fileRepo.find({
            where: messageFileIds.size
                ? [...messageFileIds].map((id) => ({ id }))
                : [{ id: 'none' }],
        });
        const removePhysical = (storagePath) => {
            const fullPath = path.join(this.uploadBaseDir, storagePath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        };
        for (const f of files) {
            removePhysical(f.storagePath);
        }
        for (const mf of messageFiles) {
            if (!files.some((f) => f.id === mf.id)) {
                removePhysical(mf.storagePath);
            }
        }
        if (messageFileIds.size) {
            await this.fileRepo.delete([...messageFileIds]);
        }
        await this.fileRepo.delete({ targetId: cabinetId });
        if (sessionIds.length > 0) {
            await this.messageRepo.delete(sessionIds.map((id) => ({ sessionId: id })));
            await this.sessionRepo.delete(sessionIds.map((id) => ({ id })));
        }
        await this.userRepo.delete({ cabinetId });
        await this.cabinetRepo.delete(cabinetId);
        const cabinetDir = path.join(this.uploadBaseDir, 'cabinet', cabinetId);
        if (fs.existsSync(cabinetDir)) {
            fs.rmSync(cabinetDir, { recursive: true, force: true });
        }
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(cabinet_entity_1.Cabinet)),
    __param(2, (0, typeorm_1.InjectRepository)(file_entity_1.FileEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(session_entity_1.Session)),
    __param(4, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AdminService);
//# sourceMappingURL=admin.service.js.map