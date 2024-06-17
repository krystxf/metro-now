export type MetroLine = "A" | "B" | "C";

export type Timestamp = {
    predicted: string;
    scheduled: string;
};

export type Delay = {
    is_available?: unknown;
    minutes?: unknown;
    seconds?: unknown;
};
