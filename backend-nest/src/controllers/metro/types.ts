import type { MetroStationName } from "../../data/metro-stations";
import type { PlatformID } from "../../data/platforms";
import type { MetroLine, Timestamp } from "../../types/types";

export type DepartureResponse = {
    heading: MetroStationName;
    line: MetroLine;
    departure: string;
    delay: number | null; // seconds
    platform: PlatformID;
};

export type GetMetroResponse = DepartureResponse[];
export type GetMetroResponseByKey = Record<string, DepartureResponse[]>;
export type GolemioResponse = {
    stops: {
        stop_id: PlatformID;
        stop_name: MetroStationName;
    }[];
    departures: {
        arrival_timestamp: Timestamp;
        route: {
            short_name: MetroLine;
        };
        stop: {
            id: string;
        };
        delay: {
            is_available: boolean;
            minutes: number | undefined;
            seconds: number | undefined;
        };
        departure_timestamp: Timestamp;
        trip: {
            headsign: MetroStationName;
        };
    }[];
};
