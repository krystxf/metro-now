import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Inject,
    Query,
    UseInterceptors,
} from "@nestjs/common";
import { parseMetroStation } from "../validation/metro-station";
import { titleByMetroStation } from "../data/metro-stations";
import { parseQueryParam } from "../utils/query-params";
import { group, unique } from "radash";
import { platformIDs } from "../data/platforms";
import { getPlatformsByStation } from "../utils/station";
import type { DepartureResponse, GetMetroResponseByKey } from "./types";
import type { PlatformID } from "../data/platforms";
import { CACHE_MANAGER, CacheInterceptor } from "@nestjs/cache-manager";
import { fetchDeparturesByGtfsID } from "../utils/fetch";

const ERROR_MSG = `Invalid "station" parameter. Supported stations: ${Object.keys(titleByMetroStation).join(", ")}`;
const MAX_STATIONS = 20;

@UseInterceptors(CacheInterceptor)
@Controller("metro")
export class MetroController {
    constructor(@Inject(CACHE_MANAGER) private cacheManager) {}

    @Get()
    async getMetroDepartures(
        @Query("station") station?: string | string[],
        @Query("platform") platform?: string | string[],
        @Query("groupBy") groupBy?: "platform" | "heading",
    ): Promise<DepartureResponse[] | GetMetroResponseByKey> {
        const gtfsIDs: PlatformID[] = getGtfsIDs({ station, platform });

        const res = fetchDeparturesByGtfsID<DepartureResponse[]>(
            this.cacheManager,
            gtfsIDs,
        );

        if (groupBy === "platform") {
            return res;
        }

        const resAsArray = Object.values(await res).flat();

        if (groupBy === "heading") {
            return group(resAsArray, (departure) => departure.heading);
        }

        return resAsArray;
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
