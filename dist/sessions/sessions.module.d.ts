import { OnModuleInit } from '@nestjs/common';
import { SessionsService } from './sessions.service';
export declare class SessionsModule implements OnModuleInit {
    private readonly sessionsService;
    constructor(sessionsService: SessionsService);
    onModuleInit(): Promise<void>;
}
