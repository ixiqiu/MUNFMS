import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '../entities/user.entity';
import { Cabinet } from '../entities/cabinet.entity';
export declare class AuthService {
    private userRepository;
    private cabinetRepository;
    private jwtService;
    constructor(userRepository: Repository<User>, cabinetRepository: Repository<Cabinet>, jwtService: JwtService);
    validateUser(username: string, password: string): Promise<any>;
    login(user: User): Promise<{
        access_token: string;
        user: {
            id: string;
            name: string;
            role: UserRole;
            cabinet: Cabinet;
        };
    }>;
    registerWithCabinet(name: string, password: string, role: string, cabinetName: string, cabinetType: string): Promise<{
        id: string;
        name: string;
        role: UserRole;
        cabinet: Cabinet;
        cabinetId: string;
    }>;
}
