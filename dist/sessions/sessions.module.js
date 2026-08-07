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
exports.SessionsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const sessions_controller_1 = require("./sessions.controller");
const sessions_service_1 = require("./sessions.service");
const session_entity_1 = require("../entities/session.entity");
const session_member_entity_1 = require("../entities/session-member.entity");
const message_entity_1 = require("../entities/message.entity");
const file_entity_1 = require("../entities/file.entity");
const cabinet_entity_1 = require("../entities/cabinet.entity");
const user_entity_1 = require("../entities/user.entity");
const events_module_1 = require("../events/events.module");
let SessionsModule = class SessionsModule {
    constructor(sessionsService) {
        this.sessionsService = sessionsService;
    }
    async onModuleInit() {
        await this.sessionsService.migrateLegacySessions();
    }
};
exports.SessionsModule = SessionsModule;
exports.SessionsModule = SessionsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([session_entity_1.Session, session_member_entity_1.SessionMember, message_entity_1.Message, file_entity_1.FileEntity, cabinet_entity_1.Cabinet, user_entity_1.User]),
            events_module_1.EventsModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    secret: configService.get('JWT_SECRET', 'mun-secret-key'),
                    signOptions: { expiresIn: '24h' },
                }),
            }),
        ],
        controllers: [sessions_controller_1.SessionsController],
        providers: [sessions_service_1.SessionsService],
        exports: [sessions_service_1.SessionsService],
    }),
    __metadata("design:paramtypes", [sessions_service_1.SessionsService])
], SessionsModule);
//# sourceMappingURL=sessions.module.js.map