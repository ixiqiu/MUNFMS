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
exports.AsymMessage = void 0;
const typeorm_1 = require("typeorm");
const message_entity_1 = require("./message.entity");
let AsymMessage = class AsymMessage {
};
exports.AsymMessage = AsymMessage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AsymMessage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AsymMessage.prototype, "cabinetId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-enum', enum: message_entity_1.MessageSenderType, default: message_entity_1.MessageSenderType.CABINET }),
    __metadata("design:type", String)
], AsymMessage.prototype, "senderType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AsymMessage.prototype, "senderUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], AsymMessage.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AsymMessage.prototype, "fileId", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], AsymMessage.prototype, "isRead", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AsymMessage.prototype, "createdAt", void 0);
exports.AsymMessage = AsymMessage = __decorate([
    (0, typeorm_1.Entity)('asym_messages')
], AsymMessage);
//# sourceMappingURL=asym-message.entity.js.map