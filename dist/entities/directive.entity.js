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
exports.Directive = exports.DirectiveStatus = void 0;
const typeorm_1 = require("typeorm");
var DirectiveStatus;
(function (DirectiveStatus) {
    DirectiveStatus["PENDING"] = "PENDING";
    DirectiveStatus["ACCEPTED"] = "ACCEPTED";
    DirectiveStatus["REJECTED"] = "REJECTED";
})(DirectiveStatus || (exports.DirectiveStatus = DirectiveStatus = {}));
let Directive = class Directive {
};
exports.Directive = Directive;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Directive.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Directive.prototype, "periodId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Directive.prototype, "typeId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Directive.prototype, "typeName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Directive.prototype, "cabinetId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Directive.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Directive.prototype, "fileId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-enum', enum: DirectiveStatus, default: DirectiveStatus.PENDING }),
    __metadata("design:type", String)
], Directive.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Directive.prototype, "reply", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Directive.prototype, "replyFileId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Directive.prototype, "sequence", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Directive.prototype, "reviewedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Directive.prototype, "reviewerId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Directive.prototype, "createdAt", void 0);
exports.Directive = Directive = __decorate([
    (0, typeorm_1.Entity)('directives'),
    (0, typeorm_1.Index)(['periodId', 'cabinetId', 'typeId', 'sequence'], { unique: true })
], Directive);
//# sourceMappingURL=directive.entity.js.map