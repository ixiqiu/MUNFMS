export declare enum DirectiveStatus {
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    REJECTED = "REJECTED"
}
export declare class Directive {
    id: string;
    periodId: string;
    typeId: string;
    typeName: string;
    cabinetId: string;
    content: string;
    fileId: string | null;
    status: DirectiveStatus;
    reply: string | null;
    replyFileId: string | null;
    sequence: number;
    reviewedAt: Date | null;
    reviewerId: string | null;
    createdAt: Date;
}
