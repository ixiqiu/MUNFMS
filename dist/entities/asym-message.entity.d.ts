import { MessageSenderType } from './message.entity';
export declare class AsymMessage {
    id: string;
    cabinetId: string;
    senderType: MessageSenderType;
    senderUserId: string;
    content: string | null;
    fileId: string | null;
    isRead: boolean;
    createdAt: Date;
}
