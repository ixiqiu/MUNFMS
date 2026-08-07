"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsService = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const crypto_1 = require("crypto");
const TICKET_TTL_MS = 60_000;
const CLEANUP_INTERVAL_MS = 60_000;
let EventsService = class EventsService {
    constructor() {
        this.event$ = new rxjs_1.Subject();
        this.tickets = new Map();
    }
    issueTicket(userId) {
        const ticket = (0, crypto_1.randomBytes)(32).toString('hex');
        this.tickets.set(ticket, { userId, expiresAt: Date.now() + TICKET_TTL_MS });
        return ticket;
    }
    consumeTicket(ticket) {
        const entry = this.tickets.get(ticket);
        this.tickets.delete(ticket);
        if (!entry) {
            return null;
        }
        if (entry.expiresAt < Date.now()) {
            return null;
        }
        return entry.userId;
    }
    emit(event) {
        this.event$.next(event);
    }
    observe() {
        return this.event$.asObservable();
    }
    onModuleInit() {
        this.cleanupTimer = setInterval(() => {
            const now = Date.now();
            for (const [ticket, entry] of this.tickets) {
                if (entry.expiresAt < now) {
                    this.tickets.delete(ticket);
                }
            }
        }, CLEANUP_INTERVAL_MS);
    }
    onModuleDestroy() {
        clearInterval(this.cleanupTimer);
    }
};
exports.EventsService = EventsService;
exports.EventsService = EventsService = __decorate([
    (0, common_1.Injectable)()
], EventsService);
//# sourceMappingURL=events.service.js.map