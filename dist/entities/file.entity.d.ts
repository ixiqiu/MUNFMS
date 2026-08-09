export declare enum SpaceType {
    CABINET = "CABINET",
    PUBLIC = "PUBLIC",
    CONFERENCE = "CONFERENCE",
    CONSULT = "CONSULT",
    TIMELINE = "TIMELINE",
    DIRECTIVE = "DIRECTIVE",
    ASYMMETRIC = "ASYMMETRIC"
}
export declare class FileEntity {
    id: string;
    fileName: string;
    storagePath: string;
    spaceType: SpaceType;
    uploaderId: string;
    targetId: string;
    isFromConference: boolean;
    createdAt: Date;
}
