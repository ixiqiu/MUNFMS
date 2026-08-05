"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const files_controller_1 = require("./files.controller");
const files_service_1 = require("./files.service");
const file_entity_1 = require("../entities/file.entity");
const user_entity_1 = require("../entities/user.entity");
const cabinet_entity_1 = require("../entities/cabinet.entity");
const session_entity_1 = require("../entities/session.entity");
const message_entity_1 = require("../entities/message.entity");
const space_permission_guard_1 = require("../common/guards/space-permission.guard");
let FilesModule = class FilesModule {
};
exports.FilesModule = FilesModule;
exports.FilesModule = FilesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([file_entity_1.FileEntity, user_entity_1.User, cabinet_entity_1.Cabinet, session_entity_1.Session, message_entity_1.Message]),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    secret: configService.get('JWT_SECRET', 'mun-secret-key'),
                    signOptions: { expiresIn: '24h' },
                }),
            }),
        ],
        controllers: [files_controller_1.FilesController],
        providers: [files_service_1.FilesService, space_permission_guard_1.SpacePermissionGuard],
        exports: [files_service_1.FilesService],
    })
], FilesModule);
//# sourceMappingURL=files.module.js.map