import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Query,
} from "@nestjs/common";
import { parseMetroStation } from "../validation/metro-station";
import {
    platformsByMetroStation,
    titleByMetroStation,
} from "../data/metro-stations";
import { parseQueryParam } from "../utils/query-params";
import { group, unique } from "radash";
import { platformIDs } from "../data/platforms";
import type { MetroStationName } from "../data/metro-stations";
import type { PlatformID } from "../data/platforms";
import type { MetroLine, Timestamp } from "../types/types";
import {
    getDelayInSeconds,
    getGolemioHeaders,
    GOLEMIO_ENDPOINT,
} from "../utils/fetch";

const ERROR_MSG = `Invalid "station" parameter. Supported stations: ${Object.keys(titleByMetroStation).join(", ")}`;
const MAX_STATIONS = 10;

type DepartureResponse = {
    heading: MetroStationName;
    line: MetroLine;
    departure: string;
    delay: number | null; // seconds
    platform: PlatformID;
};

type GetMetroResponse = {
    [key in PlatformID]?: DepartureResponse[];
};

@Controller("metro")
export class MetroController {
    @Get()
    async getMetroDepartures(
        @Query("station") station?: string | string[],
    ): Promise<GetMetroResponse> {
        if (!station) {
            throw new HttpException(ERROR_MSG, HttpStatus.BAD_REQUEST);
        }

        const stations = parseQueryParam(station);
        if (!stations.length) {
            throw new HttpException(ERROR_MSG, HttpStatus.BAD_REQUEST);
        }

        const parsedStations = stations.map(parseMetroStation);
        if (parsedStations.includes(null)) {
            throw new HttpException(ERROR_MSG, HttpStatus.BAD_REQUEST);
        } else if (parsedStations.length > MAX_STATIONS) {
            throw new HttpException(
                `Too many stations. Maximum is ${MAX_STATIONS}.`,
                HttpStatus.BAD_REQUEST,
            );
        }

        const res = await getDepartures(
            parsedStations.flatMap(
                (station) => platformsByMetroStation[station],
            ),
        );

        if (!res) {
            throw new HttpException(
                "Failed to fetch data.",
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        return res;
    }
}

type GolemioResponse = {
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

const getDepartures = async (
    platforms: PlatformID[],
): Promise<GetMetroResponse> => {
    const uniquePlatforms = unique(platforms);
    if (!uniquePlatforms.every((id) => platformIDs.includes(id))) {
        return null;
    }

    const res = await fetch(
        new URL(
            `${GOLEMIO_ENDPOINT}?order=real&${uniquePlatforms.map((id) => `ids[]=${id}`).join("&")}`,
        ),
        {
            method: "GET",
            headers: getGolemioHeaders(),
        },
    );

    const parsedRes: GolemioResponse = await res.json();
    const parsedDepartures = parsedRes.departures.map((departure) => {
        const { delay, departure_timestamp, trip, route, stop } = departure;

        return {
            delay: getDelayInSeconds(delay),
            departure: departure_timestamp.predicted,
            heading: trip.headsign,
            line: route.short_name,
            platform: stop.id as PlatformID,
        };
    });

    return group(parsedDepartures, (departure) => departure.platform);
};
