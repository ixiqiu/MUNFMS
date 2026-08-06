import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { JwtPayload } from '../common/decorators';
declare const JwtStrategy_base: new (...args: any) => any;
export declare class JwtStrategy extends JwtStrategy_base {
    private configService;
    private userRepository;
    constructor(configService: ConfigService, userRepository: Repository<User>);
    validate(payload: JwtPayload): Promise<{
        id: string;
        name: string;
        role: import("../entities/user.entity").UserRole;
        cabinet: import("../entities").Cabinet | null;
        cabinetId: string | null;
        createdAt: Date;
    }>;
}
export {};
