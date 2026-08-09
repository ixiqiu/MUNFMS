"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirectivesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const directives_controller_1 = require("./directives.controller");
const directives_service_1 = require("./directives.service");
const directive_entity_1 = require("../entities/directive.entity");
const directive_type_entity_1 = require("../entities/directive-type.entity");
const global_state_entity_1 = require("../entities/global-state.entity");
const conference_period_entity_1 = require("../entities/conference-period.entity");
const file_entity_1 = require("../entities/file.entity");
const cabinet_entity_1 = require("../entities/cabinet.entity");
const events_module_1 = require("../events/events.module");
let DirectivesModule = class DirectivesModule {
};
exports.DirectivesModule = DirectivesModule;
exports.DirectivesModule = DirectivesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                directive_entity_1.Directive,
                directive_type_entity_1.DirectiveType,
                global_state_entity_1.GlobalState,
                conference_period_entity_1.ConferencePeriod,
                file_entity_1.FileEntity,
                cabinet_entity_1.Cabinet,
            ]),
            events_module_1.EventsModule,
        ],
        controllers: [directives_controller_1.DirectivesController],
        providers: [directives_service_1.DirectivesService],
    })
], DirectivesModule);
//# sourceMappingURL=directives.module.js.map