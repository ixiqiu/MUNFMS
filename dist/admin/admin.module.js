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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../entities/user.entity");
const cabinet_entity_1 = require("../entities/cabinet.entity");
const file_entity_1 = require("../entities/file.entity");
const session_entity_1 = require("../entities/session.entity");
const message_entity_1 = require("../entities/message.entity");
const admin_controller_1 = require("./admin.controller");
const admin_service_1 = require("./admin.service");
let AdminModule = class AdminModule {
    constructor(adminService) {
        this.adminService = adminService;
    }
    async onModuleInit() {
        const admin = await this.adminService.seedAdmin();
        if (admin) {
            console.log(`[AdminModule] 初始管理员已创建: ${admin.name} / admin123（请尽快修改密码）`);
        }
    }
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, cabinet_entity_1.Cabinet, file_entity_1.FileEntity, session_entity_1.Session, message_entity_1.Message]),
        ],
        controllers: [admin_controller_1.AdminController],
        providers: [admin_service_1.AdminService],
        exports: [admin_service_1.AdminService],
    }),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminModule);
//# sourceMappingURL=admin.module.js.map