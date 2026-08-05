import { AuthService } from './auth.service';
import { UserRole } from '../entities/user.entity';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(req: any): Promise<{
        access_token: string;
        user: {
            id: string;
            name: string;
            role: UserRole;
            cabinet: import("../entities").Cabinet;
        };
    }>;
    register(body: {
        name: string;
        password: string;
        role: UserRole;
        cabinetId: string;
    }): Promise<{
        message: string;
        user: {
            id: string;
            name: string;
            role: UserRole;
            cabinet: import("../entities").Cabinet | null;
            cabinetId: string | null;
            createdAt: Date;
        };
    }>;
}
