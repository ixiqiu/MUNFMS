import { OnModuleInit } from '@nestjs/common';
import { AdminService } from './admin.service';
export declare class AdminModule implements OnModuleInit {
    private readonly adminService;
    constructor(adminService: AdminService);
    onModuleInit(): Promise<void>;
}
