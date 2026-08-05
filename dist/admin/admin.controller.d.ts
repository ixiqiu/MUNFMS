import { AdminService } from './admin.service';
import { UserRole, CabinetType } from '../entities';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    listUsers(): Promise<{
        id: string;
        name: string;
        role: UserRole;
        cabinetId: string;
        cabinet: {
            id: string;
            name: string;
            type: CabinetType;
        };
        createdAt: Date;
    }[]>;
    createUser(body: {
        name: string;
        password: string;
        role: UserRole;
        cabinetId?: string;
    }): Promise<{
        id: string;
        name: string;
        role: UserRole;
        cabinet: import("../entities").Cabinet | null;
        cabinetId: string | null;
        createdAt: Date;
    }>;
    changePassword(id: string, body: {
        newPassword: string;
    }): Promise<void>;
    deleteUser(id: string, operator: {
        id: string;
    }): Promise<void>;
    createCabinet(body: {
        name: string;
        type: CabinetType;
    }): Promise<import("../entities").Cabinet>;
    deleteCabinet(id: string): Promise<void>;
}
