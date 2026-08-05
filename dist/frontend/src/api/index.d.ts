import type { LoginResponse, User, FileEntity, Session, Message, SpaceType, UserRole, CabinetType } from '../types';
export declare const authApi: {
    login(username: string, password: string): Promise<LoginResponse>;
    register(payload: {
        name: string;
        password: string;
        role: UserRole;
        cabinetName: string;
        cabinetType: CabinetType;
    }): Promise<{
        message: string;
        user: User;
    }>;
};
export declare const filesApi: {
    list(space: SpaceType, type?: string): Promise<FileEntity[]>;
    upload(space: SpaceType, file: File): Promise<FileEntity>;
    download(id: string): Promise<import("axios").AxiosResponse<Blob, any, {}, any>>;
    publish(id: string): Promise<FileEntity>;
    remove(id: string): Promise<{
        message: string;
    }>;
};
export declare const sessionsApi: {
    list(): Promise<Session[]>;
    create(targetCabinetId: string): Promise<Session>;
    messages(sessionId: string): Promise<Message[]>;
    sendMessage(sessionId: string, file: File): Promise<Message>;
    downloadMessage(messageId: string): Promise<import("axios").AxiosResponse<Blob, any, {}, any>>;
};
