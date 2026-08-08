import { Session } from './session.entity';
import { FileEntity } from './file.entity';
export declare enum MessageSenderType {
    CABINET = "CABINET",
    ACADEMIC = "ACADEMIC"
}
export declare class Message {
    id: string;
    session: Session;
    sessionId: string;
    senderCabinetId: string | null;
    senderType: MessageSenderType;
    file: FileEntity | null;
    fileId: string | null;
    content: string | null;
    senderUserId: string | null;
    isRead: boolean;
    createdAt: Date;
}
