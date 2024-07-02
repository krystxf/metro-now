import { platformIDs } from "../../data/platforms";
import { getGolemioHeaders } from "../../utils/fetch";
import { getDelayInSeconds } from "../../utils/delay";
import { GOLEMIO_API } from "../../constants";
import type { PlatformID } from "../../data/platforms";
import type { DepartureResponse, GolemioResponse } from "./types";

export const getDepartures = async (
    platforms: PlatformID[],
): Promise<DepartureResponse[]> => {
    if (!platforms.length) {
        return [];
    }
    if (!platforms.every((p) => platformIDs.includes(p))) {
        return [];
    }

    const res = await fetch(
        new URL(
            `/v2/pid/departureboards?order=real&${platforms.map((id) => `ids[]=${id}`).join("&")}`,
            GOLEMIO_API,
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

    return parsedDepartures;
};
