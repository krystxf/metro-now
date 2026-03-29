import { Open as unzipperOpen } from "unzipper";
import { z } from "zod";

import type { GtfsSnapshot } from "../types/sync.types";
import { parseCsvString } from "../utils/csv.utils";
import { fetchWithTimeout } from "../utils/fetch.utils";

const GTFS_ARCHIVE_URL = "https://data.pid.cz/PID_GTFS.zip";

const gtfsRouteRecordSchema = z.object({
    route_id: z.string().min(1),
    route_short_name: z.string().min(1),
    route_long_name: z.string().optional(),
    route_type: z.string().min(1),
    route_color: z.string().optional(),
    is_night: z.string().optional(),
    route_url: z.string().optional(),
});

const gtfsRouteStopRecordSchema = z.object({
    route_id: z.string().min(1),
    direction_id: z.string().min(1),
    stop_id: z.string().min(1),
    stop_sequence: z.string().min(1),
});

export class GtfsService {
    async getGtfsSnapshot(platformIds: Set<string>): Promise<GtfsSnapshot> {
        const response = await fetchWithTimeout(GTFS_ARCHIVE_URL);

        if (!response.ok) {
            throw new Error(
                `Failed to fetch GTFS archive: ${response.status} ${response.statusText}`,
            );
        }

        const directory = await unzipperOpen.buffer(
            Buffer.from(await response.arrayBuffer()),
        );
        const routesEntry = directory.files.find(
            (file) => file.path === "routes.txt",
        );
        const routeStopsEntry = directory.files.find(
            (file) => file.path === "route_stops.txt",
        );

        if (!routesEntry) {
            throw new Error("routes.txt not found in GTFS archive");
        }

        if (!routeStopsEntry) {
            throw new Error("route_stops.txt not found in GTFS archive");
        }

        const rawRoutes = await parseCsvString<Record<string, string>>(
            (await routesEntry.buffer()).toString(),
        );
        const rawRouteStops = await parseCsvString<Record<string, string>>(
            (await routeStopsEntry.buffer()).toString(),
        );

        return {
            gtfsRoutes: rawRoutes.map((route) =>
                this.parseGtfsRouteRecord(route),
            ),
            gtfsRouteStops: rawRouteStops
                .map((routeStop) => this.parseGtfsRouteStopRecord(routeStop))
                .filter((routeStop) => platformIds.has(routeStop.platformId)),
        };
    }

    private parseGtfsRouteRecord(route: Record<string, string>) {
        const parsed = gtfsRouteRecordSchema.safeParse(route);

        if (!parsed.success) {
            throw new Error(
                `Invalid GTFS route record: ${parsed.error.message}`,
            );
        }

        return {
            id: parsed.data.route_id,
            shortName: parsed.data.route_short_name,
            longName: this.toOptionalString(parsed.data.route_long_name),
            type: parsed.data.route_type,
            color: this.toOptionalString(parsed.data.route_color),
            isNight: this.parseNightFlag(parsed.data.is_night),
            url: this.toOptionalString(parsed.data.route_url),
        };
    }

    private parseGtfsRouteStopRecord(routeStop: Record<string, string>) {
        const parsed = gtfsRouteStopRecordSchema.safeParse(routeStop);

        if (!parsed.success) {
            throw new Error(
                `Invalid GTFS route stop record: ${parsed.error.message}`,
            );
        }

        const stopSequence = Number(parsed.data.stop_sequence);

        if (!Number.isInteger(stopSequence)) {
            throw new Error(
                `Invalid GTFS stop sequence: ${parsed.data.stop_sequence}`,
            );
        }

        return {
            routeId: parsed.data.route_id,
            directionId: parsed.data.direction_id,
            platformId: this.normalizePlatformId(parsed.data.stop_id),
            stopSequence,
        };
    }

    private normalizePlatformId(stopId: string): string {
        return stopId.split("_")[0];
    }

    private parseNightFlag(value?: string): boolean | null {
        if (value === undefined || value.trim() === "") {
            return null;
        }

        if (value === "1") {
            return true;
        }

        if (value === "0") {
            return false;
        }

        throw new Error(`Unexpected GTFS is_night flag: ${value}`);
    }

    private toOptionalString(value?: string): string | null {
        if (value === undefined) {
            return null;
        }

        const trimmed = value.trim();

        return trimmed.length > 0 ? trimmed : null;
    }
}
