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
exports.FilesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const file_entity_1 = require("../entities/file.entity");
const user_entity_1 = require("../entities/user.entity");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
let FilesService = class FilesService {
    constructor(fileRepo, userRepo) {
        this.fileRepo = fileRepo;
        this.userRepo = userRepo;
        this.uploadBaseDir = path.join(process.cwd(), 'uploads');
        this.ensureUploadDirs();
    }
    ensureUploadDirs() {
        const dirs = [
            path.join(this.uploadBaseDir, 'cabinet'),
            path.join(this.uploadBaseDir, 'public'),
            path.join(this.uploadBaseDir, 'conference'),
        ];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    async uploadFile(file, spaceType, user) {
        let targetId;
        let storageDir;
        switch (spaceType) {
            case file_entity_1.SpaceType.CABINET:
                targetId = user.cabinetId;
                storageDir = path.join(this.uploadBaseDir, 'cabinet', targetId);
                break;
            case file_entity_1.SpaceType.PUBLIC:
                if (user.role !== user_entity_1.UserRole.ACADEMIC) {
                    throw new common_1.ForbiddenException('只有学术组成员可以上传公共空间文件');
                }
                targetId = 'PUBLIC';
                storageDir = path.join(this.uploadBaseDir, 'public');
                break;
            case file_entity_1.SpaceType.CONFERENCE:
                targetId = 'CONFERENCE';
                storageDir = path.join(this.uploadBaseDir, 'conference');
                break;
            default:
                throw new common_1.BadRequestException('无效的空间类型');
        }
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }
        const uniqueFileName = `${(0, uuid_1.v4)()}_${file.originalname}`;
        const storagePath = path.join(storageDir, uniqueFileName);
        const relativePath = path.join(spaceType.toLowerCase(), targetId, uniqueFileName);
        try {
            await fs.promises.rename(file.path, storagePath);
            const fileEntity = this.fileRepo.create({
                fileName: file.originalname,
                storagePath: relativePath,
                spaceType,
                uploaderId: user.id,
                targetId,
                isFromConference: false,
            });
            return await this.fileRepo.save(fileEntity);
        }
        catch (error) {
            if (fs.existsSync(storagePath)) {
                await fs.promises.unlink(storagePath);
            }
            throw error;
        }
    }
    async getFiles(spaceType, user, type) {
        const query = this.fileRepo.createQueryBuilder('file');
        switch (spaceType) {
            case file_entity_1.SpaceType.CABINET:
                query.where('file.spaceType = :spaceType', { spaceType: file_entity_1.SpaceType.CABINET })
                    .andWhere('file.targetId = :targetId', { targetId: user.cabinetId });
                break;
            case file_entity_1.SpaceType.PUBLIC:
                query.where('file.spaceType = :spaceType', { spaceType: file_entity_1.SpaceType.PUBLIC });
                break;
            case file_entity_1.SpaceType.CONFERENCE:
                if (type === 'MY') {
                    query.where('file.spaceType = :spaceType', { spaceType: file_entity_1.SpaceType.CONFERENCE })
                        .andWhere('file.uploaderId = :uploaderId', { uploaderId: user.id });
                }
                else if (user.role === user_entity_1.UserRole.ACADEMIC) {
                    query.where('file.spaceType = :spaceType', { spaceType: file_entity_1.SpaceType.CONFERENCE });
                }
                else {
                    query.where('file.spaceType = :spaceType', { spaceType: file_entity_1.SpaceType.CONFERENCE })
                        .andWhere('file.uploaderId = :uploaderId', { uploaderId: user.id });
                }
                break;
        }
        query.orderBy('file.createdAt', 'DESC');
        return await query.getMany();
    }
    async getFile(fileId, user) {
        const file = await this.fileRepo.findOne({ where: { id: fileId } });
        if (!file) {
            throw new common_1.NotFoundException('文件不存在');
        }
        if (file.spaceType === file_entity_1.SpaceType.CABINET && file.targetId !== user.cabinetId) {
            throw new common_1.ForbiddenException('无权访问该内阁文件');
        }
        if (file.spaceType === file_entity_1.SpaceType.CONFERENCE) {
            if (user.role !== user_entity_1.UserRole.ACADEMIC && file.uploaderId !== user.id) {
                throw new common_1.ForbiddenException('无权访问该会议文件');
            }
        }
        return file;
    }
    async downloadFile(fileId, user) {
        const file = await this.getFile(fileId, user);
        const fullPath = path.join(this.uploadBaseDir, file.storagePath);
        if (!fs.existsSync(fullPath)) {
            throw new common_1.NotFoundException('物理文件不存在');
        }
        const readStream = fs.createReadStream(fullPath);
        return { readStream, fileName: file.fileName };
    }
    async publishToPublic(fileId, user) {
        if (user.role !== user_entity_1.UserRole.ACADEMIC) {
            throw new common_1.ForbiddenException('只有学术组成员可以执行一键复制操作');
        }
        const originalFile = await this.fileRepo.findOne({ where: { id: fileId } });
        if (!originalFile) {
            throw new common_1.NotFoundException('文件不存在');
        }
        if (originalFile.spaceType !== file_entity_1.SpaceType.CONFERENCE) {
            throw new common_1.BadRequestException('只能复制会议空间的文件到公共空间');
        }
        const srcPath = path.join(this.uploadBaseDir, originalFile.storagePath);
        const destDir = path.join(this.uploadBaseDir, 'public');
        const uniqueFileName = `${(0, uuid_1.v4)()}_${originalFile.fileName}`;
        const destPath = path.join(destDir, uniqueFileName);
        if (!fs.existsSync(srcPath)) {
            throw new common_1.NotFoundException('原文件不存在');
        }
        try {
            await fs.promises.copyFile(srcPath, destPath);
            const newFile = this.fileRepo.create({
                fileName: originalFile.fileName,
                storagePath: path.join('public', uniqueFileName),
                spaceType: file_entity_1.SpaceType.PUBLIC,
                uploaderId: user.id,
                targetId: 'PUBLIC',
                isFromConference: true,
            });
            return await this.fileRepo.save(newFile);
        }
        catch (error) {
            if (fs.existsSync(destPath)) {
                await fs.promises.unlink(destPath);
            }
            throw error;
        }
    }
    async deleteFile(fileId, user) {
        const file = await this.getFile(fileId, user);
        if (file.spaceType === file_entity_1.SpaceType.PUBLIC && user.role !== user_entity_1.UserRole.ACADEMIC) {
            throw new common_1.ForbiddenException('只有学术组成员可以删除公共空间文件');
        }
        if (file.spaceType === file_entity_1.SpaceType.CONFERENCE && user.role !== user_entity_1.UserRole.ACADEMIC) {
            throw new common_1.ForbiddenException('只有学术组成员可以删除会议空间文件');
        }
        if (file.spaceType === file_entity_1.SpaceType.CABINET) {
            if (file.targetId !== user.cabinetId) {
                throw new common_1.ForbiddenException('无权删除该内阁文件');
            }
        }
        const fullPath = path.join(this.uploadBaseDir, file.storagePath);
        if (fs.existsSync(fullPath)) {
            await fs.promises.unlink(fullPath);
        }
        await this.fileRepo.delete(fileId);
    }
};
exports.FilesService = FilesService;
exports.FilesService = FilesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(file_entity_1.FileEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], FilesService);
//# sourceMappingURL=files.service.js.map