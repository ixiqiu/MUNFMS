import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(body: {
        username: string;
        password: string;
    }): Promise<{
        access_token: string;
        user: {
            id: string;
            name: string;
            role: import("../entities").UserRole;
            cabinet: import("../entities").Cabinet;
        };
    }>;
    register(body: {
        name: string;
        password: string;
        role: string;
        cabinetName: string;
        cabinetType: string;
    }): Promise<{
        message: string;
        user: import("../entities").User[];
    }>;
}
