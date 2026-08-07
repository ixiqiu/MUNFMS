import { Request, Response } from 'express';
import { EventsService } from './events.service';
import { User } from '../entities/user.entity';
export declare class EventsController {
    private readonly eventsService;
    constructor(eventsService: EventsService);
    issueTicket(user: User): {
        ticket: string;
    };
    stream(ticket: string, _req: Request, res: Response): void;
}
