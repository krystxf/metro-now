import { Injectable } from "@nestjs/common";
import { GOLEMIO_API } from "src/constants";
import type { DepartureSchema } from "./schema/departure.schema";
import { departureBoardsSchema } from "./schema/departure-boards.schema";
import { getDelayInSeconds } from "src/utils/delay";

@Injectable()
export class DepartureService {
    constructor() {}

    async getDeparturesByPlatform(
        platforms: string[],
    ): Promise<DepartureSchema[]> {
        const url = new URL("/v2/pid/departureboards", GOLEMIO_API);
        url.searchParams.append("order", "real");
        platforms.forEach((id) => {
            url.searchParams.append("ids[]", id);
        });

        const res = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-Access-Token": process.env.GOLEMIO_API_KEY,
            },
        });

        const json = await res.json();
        const parsed = departureBoardsSchema.safeParse(json);

        if (!parsed.success) {
            throw new Error(parsed.error.message);
        }

        return parsed.data.departures.map((departure) => ({
            departure: departure.departure_timestamp,
            delay: getDelayInSeconds(departure.delay),
            headsign: departure.trip.headsign,
            route: departure.route.short_name,
            platformId: departure.stop.id,
            platformCode: departure.stop.platform_code,
        }));
    }
}
