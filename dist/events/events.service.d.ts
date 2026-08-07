import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SpaceType } from '../entities/file.entity';
export type SseEventType = 'file.changed' | 'session.changed' | 'message.new' | 'cabinet.deleted';
export interface SseEvent {
    type: SseEventType;
    spaceType?: SpaceType;
    targetId?: string | null;
    sessionId?: string;
    actorId?: string;
    ts: number;
}
export declare class EventsService implements OnModuleInit, OnModuleDestroy {
    private readonly event$;
    private readonly tickets;
    private cleanupTimer;
    issueTicket(userId: string): string;
    consumeTicket(ticket: string): string | null;
    emit(event: SseEvent): void;
    observe(): Observable<SseEvent>;
    onModuleInit(): void;
    onModuleDestroy(): void;
}
