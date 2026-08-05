import { Cabinet } from './cabinet.entity';
export declare enum UserRole {
    DELEGATE = "DELEGATE",
    ACADEMIC = "ACADEMIC"
}
export declare class User {
    id: string;
    name: string;
    role: UserRole;
    passwordHash: string;
    cabinet: Cabinet;
    cabinetId: string;
}
