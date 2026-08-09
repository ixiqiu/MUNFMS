export declare enum TimelineEntryType {
    SITUATION = "SITUATION",
    NEWS = "NEWS"
}
export declare class TimelineEntry {
    id: string;
    periodId: string;
    type: TimelineEntryType;
    newsSource: string | null;
    content: string | null;
    fileId: string | null;
    sequence: number;
    createdAt: Date;
}
