import { StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { DirectivesService } from './directives.service';
import { UserRole } from '../entities/user.entity';
import { DirectiveStatus } from '../entities/directive.entity';
interface DirectiveRequestUser {
    id: string;
    name: string;
    role: UserRole;
    cabinetId: string | null;
}
export declare class DirectivesController {
    private readonly directivesService;
    constructor(directivesService: DirectivesService);
    listTypes(): Promise<{
        types: import("../entities").DirectiveType[];
    }>;
    createType(body: {
        name: string;
    }, user: DirectiveRequestUser): Promise<{
        type: import("../entities").DirectiveType;
    }>;
    deleteType(id: string, user: DirectiveRequestUser): Promise<{
        message: string;
    }>;
    list(query: {
        periodId?: string;
        typeId?: string;
        cabinetId?: string;
    }, user: DirectiveRequestUser): Promise<{
        directives: any[];
    }>;
    create(file: Express.Multer.File | undefined, body: {
        typeId: string;
        content: string;
    }, user: DirectiveRequestUser): Promise<import("../entities/directive.entity").Directive>;
    remove(id: string, user: DirectiveRequestUser): Promise<{
        message: string;
    }>;
    review(id: string, file: Express.Multer.File | undefined, body: {
        status: DirectiveStatus;
        reply?: string;
    }, user: DirectiveRequestUser): Promise<import("../entities/directive.entity").Directive>;
    downloadAttachment(id: string, user: DirectiveRequestUser, res: Response): Promise<StreamableFile>;
    downloadReply(id: string, user: DirectiveRequestUser, res: Response): Promise<StreamableFile>;
}
export {};
