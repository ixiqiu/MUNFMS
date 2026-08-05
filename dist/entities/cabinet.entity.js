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
exports.Cabinet = exports.CabinetType = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
var CabinetType;
(function (CabinetType) {
    CabinetType["CABINET"] = "CABINET";
    CabinetType["BUREAU"] = "BUREAU";
    CabinetType["CRISIS"] = "CRISIS";
})(CabinetType || (exports.CabinetType = CabinetType = {}));
let Cabinet = class Cabinet {
};
exports.Cabinet = Cabinet;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Cabinet.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Cabinet.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: CabinetType,
    }),
    __metadata("design:type", String)
], Cabinet.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => user_entity_1.User, (user) => user.cabinet),
    __metadata("design:type", Array)
], Cabinet.prototype, "users", void 0);
exports.Cabinet = Cabinet = __decorate([
    (0, typeorm_1.Entity)('cabinets')
], Cabinet);
//# sourceMappingURL=cabinet.entity.js.map