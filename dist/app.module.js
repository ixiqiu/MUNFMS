"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const auth_module_1 = require("./auth/auth.module");
const files_module_1 = require("./files/files.module");
const sessions_module_1 = require("./sessions/sessions.module");
const cabinets_module_1 = require("./cabinets/cabinets.module");
const admin_module_1 = require("./admin/admin.module");
const license_module_1 = require("./license/license.module");
const events_module_1 = require("./events/events.module");
const cabinet_entity_1 = require("./entities/cabinet.entity");
const user_entity_1 = require("./entities/user.entity");
const file_entity_1 = require("./entities/file.entity");
const session_entity_1 = require("./entities/session.entity");
const session_member_entity_1 = require("./entities/session-member.entity");
const message_entity_1 = require("./entities/message.entity");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => {
                    const dbType = configService.get('DB_TYPE', 'sqlite');
                    if (dbType === 'mariadb') {
                        return {
                            type: 'mariadb',
                            host: configService.get('DB_HOST', 'localhost'),
                            port: configService.get('DB_PORT', 3306),
                            username: configService.get('DB_USERNAME', 'root'),
                            password: configService.get('DB_PASSWORD', ''),
                            database: configService.get('DB_DATABASE', 'mun_files'),
                            entities: [cabinet_entity_1.Cabinet, user_entity_1.User, file_entity_1.FileEntity, session_entity_1.Session, session_member_entity_1.SessionMember, message_entity_1.Message],
                            synchronize: true,
                            logging: configService.get('DB_LOGGING', false),
                        };
                    }
                    else {
                        return {
                            type: 'sqlite',
                            database: configService.get('SQLITE_DB_PATH', 'dev.db'),
                            entities: [cabinet_entity_1.Cabinet, user_entity_1.User, file_entity_1.FileEntity, session_entity_1.Session, session_member_entity_1.SessionMember, message_entity_1.Message],
                            synchronize: true,
                            logging: configService.get('DB_LOGGING', false),
                        };
                    }
                },
            }),
            auth_module_1.AuthModule,
            files_module_1.FilesModule,
            sessions_module_1.SessionsModule,
            cabinets_module_1.CabinetsModule,
            admin_module_1.AdminModule,
            license_module_1.LicenseModule,
            events_module_1.EventsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map