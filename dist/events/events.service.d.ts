import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SpaceType } from '../entities/file.entity';
export type SseEventType = 'file.changed' | 'session.changed' | 'message.new' | 'cabinet.deleted' | 'period.changed' | 'timeline.changed' | 'directive.new' | 'directive.changed' | 'asym.message.new';
export interface SseEvent {
    type: SseEventType;
    spaceType?: SpaceType;
    targetId?: string | null;
    sessionId?: string;
    actorId?: string;
    fileName?: string;
    senderCabinetId?: string | null;
    entryType?: 'SITUATION' | 'NEWS';
    status?: 'ACCEPTED' | 'REJECTED';
    senderType?: 'CABINET' | 'ACADEMIC';
    ts: number;
}
export declare class EventsService implements OnModuleInit, OnModuleDestroy {
    private readonly event$;
    private readonly tickets;
    private readonly activeConnections;
    private cleanupTimer;
    connectionOpened(userId: string): void;
    connectionClosed(userId: string): void;
    isConnected(userId: string): boolean;
    issueTicket(userId: string): string;
    consumeTicket(ticket: string): string | null;
    emit(event: SseEvent): void;
    observe(): Observable<SseEvent>;
    onModuleInit(): void;
    onModuleDestroy(): void;
}
