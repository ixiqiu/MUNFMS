import { Session } from './session.entity';
import { FileEntity } from './file.entity';
export declare class Message {
    id: string;
    session: Session;
    sessionId: string;
    senderCabinetId: string;
    file: FileEntity;
    fileId: string;
    isRead: boolean;
    createdAt: Date;
}
