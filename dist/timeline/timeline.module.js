"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelineModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const timeline_controller_1 = require("./timeline.controller");
const timeline_service_1 = require("./timeline.service");
const timeline_entry_entity_1 = require("../entities/timeline-entry.entity");
const global_state_entity_1 = require("../entities/global-state.entity");
const conference_period_entity_1 = require("../entities/conference-period.entity");
const file_entity_1 = require("../entities/file.entity");
const events_module_1 = require("../events/events.module");
let TimelineModule = class TimelineModule {
};
exports.TimelineModule = TimelineModule;
exports.TimelineModule = TimelineModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([timeline_entry_entity_1.TimelineEntry, global_state_entity_1.GlobalState, conference_period_entity_1.ConferencePeriod, file_entity_1.FileEntity]),
            events_module_1.EventsModule,
        ],
        controllers: [timeline_controller_1.TimelineController],
        providers: [timeline_service_1.TimelineService],
    })
], TimelineModule);
//# sourceMappingURL=timeline.module.js.map