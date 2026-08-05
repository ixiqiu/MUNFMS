import { Cabinet } from './cabinet.entity';
export declare enum UserRole {
    ADMIN = "ADMIN",
    DELEGATE = "DELEGATE",
    ACADEMIC = "ACADEMIC"
}
export declare class User {
    id: string;
    name: string;
    role: UserRole;
    passwordHash: string;
    cabinet: Cabinet | null;
    cabinetId: string | null;
    createdAt: Date;
}
