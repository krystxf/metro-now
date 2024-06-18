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
const MAX_STATIONS = 20;

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
        @Query("platform") platform?: string | string[],
    ): Promise<GetMetroResponse> {
        if (!station && !platform) {
            throw new HttpException(ERROR_MSG, HttpStatus.BAD_REQUEST);
        }

        const stations = parseQueryParam(station) ?? [];
        const platforms = (parseQueryParam(platform) ?? []) as PlatformID[];
        if (!stations.length && !platforms.length) {
            throw new HttpException(ERROR_MSG, HttpStatus.BAD_REQUEST);
        }

        const parsedStations = stations.map(parseMetroStation);
        if (parsedStations.includes(null)) {
            throw new HttpException(ERROR_MSG, HttpStatus.BAD_REQUEST);
        }

        const invalidPlatforms = platforms.every((p) =>
            platformIDs.includes(p),
        );
        if (!invalidPlatforms) {
            throw new HttpException(
                "Some platforms are invalid.",
                HttpStatus.BAD_REQUEST,
            );
        }

        const gtfsIDs = unique([
            ...platforms,
            ...parsedStations.flatMap(
                (station) => platformsByMetroStation[station],
            ),
        ]);

        if (gtfsIDs.length > MAX_STATIONS) {
            throw new HttpException(
                `Too many stations/platforms. Maximum is ${MAX_STATIONS}.`,
                HttpStatus.BAD_REQUEST,
            );
        }

        const res = await getDepartures(gtfsIDs);

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
    if (!platforms.every((p) => platformIDs.includes(p))) {
        return null;
    }

    const res = await fetch(
        new URL(
            `${GOLEMIO_ENDPOINT}?order=real&${platforms.map((id) => `ids[]=${id}`).join("&")}`,
        ),
        {
            method: "GET",
            headers: getGolemioHeaders(),
        },
    );

    const parsedRes: GolemioResponse = await res.json();

    const parsedDepartures = parsedRes.departures.map((departure) => {
        const {
            delay,
            departure_timestamp: departureTimestamp,
            trip,
            route,
            stop,
        } = departure;

        return {
            delay: getDelayInSeconds(delay),
            departure: departureTimestamp.predicted,
            heading: trip.headsign,
            line: route.short_name,
            platform: stop.id as PlatformID,
        };
    });

    return group(parsedDepartures, (departure) => departure.platform);
};
