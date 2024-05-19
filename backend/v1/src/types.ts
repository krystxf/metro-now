export type ClientData = { clientID: string };

export enum MetroLine {
    A = "A",
    B = "B",
    C = "C",
}

export type Departure = {
    route: {
        line: MetroLine;
    };
    arrival: {
        predicted: Date;
        scheduled: Date;
    };
    departure: {
        predicted: Date;
        scheduled: Date;
    };
    delay: {
        isAvailable: boolean;
        minutes: number | null;
        seconds: number | null;
    };
    trip: {
        id: string;
        headsign: string;
        isAtStop: boolean;
        isCanceled: boolean;
    };
};
