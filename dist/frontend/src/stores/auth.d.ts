import type { User } from '../types';
export declare const useAuthStore: import("pinia").SetupStoreDefinition<"auth", {
    token: import("vue").Ref<string, string>;
    user: import("vue").Ref<{
        id: string;
        name: string;
        role: import("../types").UserRole;
        cabinetId?: string;
        cabinet?: {
            id: string;
            name: string;
            type: import("../types").CabinetType;
        };
    }, User | {
        id: string;
        name: string;
        role: import("../types").UserRole;
        cabinetId?: string;
        cabinet?: {
            id: string;
            name: string;
            type: import("../types").CabinetType;
        };
    }>;
    isLoggedIn: import("vue").ComputedRef<boolean>;
    isAcademic: import("vue").ComputedRef<boolean>;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
}>;
