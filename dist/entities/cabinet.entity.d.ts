import { User } from './user.entity';
export declare enum CabinetType {
    CABINET = "CABINET",
    BUREAU = "BUREAU",
    CRISIS = "CRISIS"
}
export declare class Cabinet {
    id: string;
    name: string;
    type: CabinetType;
    users: User[];
}
