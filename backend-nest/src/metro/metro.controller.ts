import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Query,
} from "@nestjs/common";
import { parseMetroStation } from "../validation/metro-station";
import { titleByMetroStation } from "../data/metro-stations";
import { parseQueryParam } from "../utils/query-params";
import { group, unique } from "radash";
import { platformIDs } from "../data/platforms";
import { getPlatformsByStation } from "../utils/station";
import { getDepartures } from "./getDepartures";
import type { GetMetroResponse, GetMetroResponseByKey } from "./types";
import type { PlatformID } from "../data/platforms";

const ERROR_MSG = `Invalid "station" parameter. Supported stations: ${Object.keys(titleByMetroStation).join(", ")}`;
const MAX_STATIONS = 20;

@Controller("metro")
export class MetroController {
    @Get()
    async getMetroDepartures(
        @Query("station") station?: string | string[],
        @Query("platform") platform?: string | string[],
        @Query("groupBy") groupBy?: "platform" | "heading",
    ): Promise<GetMetroResponse | GetMetroResponseByKey> {
        const gtfsIDs = getGtfsIDs({ station, platform });

        const res = await getDepartures(gtfsIDs);

        if (!res) {
            throw new HttpException(
                "Failed to fetch data.",
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        if (groupBy === "heading") {
            return group(res, (departure) => departure.heading);
        }
        if (groupBy === "platform") {
            return group(res, (departure) => departure.platform);
        }

        return res;
    }
}

const getGtfsIDs = ({
    station,
    platform,
}: {
    station?: string | string[];
    platform?: string | string[];
}): PlatformID[] => {
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

    const invalidPlatforms = platforms.every((p) => platformIDs.includes(p));
    if (!invalidPlatforms) {
        throw new HttpException(
            "Some platforms are invalid.",
            HttpStatus.BAD_REQUEST,
        );
    }

    const gtfsIDs = unique([
        ...platforms,
        ...getPlatformsByStation(parsedStations),
    ]);

    if (gtfsIDs.length > MAX_STATIONS) {
        throw new HttpException(
            `Too many stations/platforms. Maximum is ${MAX_STATIONS}.`,
            HttpStatus.BAD_REQUEST,
        );
    }

    return gtfsIDs;
};
