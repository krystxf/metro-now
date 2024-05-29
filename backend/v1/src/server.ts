import type { ServerWebSocket } from "bun";
import type { ClientData, Departure } from "./types";

import { group } from "radash";

import { STOP_IDS_HEADER, INTERVAL } from "./server/server.const";
import { fetchApiData } from "./fetch-metro/fetch-metro";
import { StopIDsSchema, SubscribeSchema, type ApiResponse } from "./schemas";
import { getParsedDeparture } from "./server/server.utils";

if (!process.env.GOLEMIO_API_KEY) {
    throw new Error("GOLEMIO_API_KEY is not set in .env");
}

let intervalId: number | null = null;

const subscribedStopIDsByClientID = new Map<string, string[]>();
const wsByClientID = new Map<string, ServerWebSocket<ClientData>>();

const departuresByStopID = new Map<string, Departure[]>();

/**
 * If clientID is provided, fetch only the stopIDs that the client is subscribed to
 * and that haven't been fetched yet.
 *
 * Otherwise, refetch all stopIDs that are subscribed by any client.
 */
const getStopIDsToFetch = (clientID?: string): string[] => {
    if (clientID !== undefined) {
        const subscribedStopIDs =
            subscribedStopIDsByClientID.get(clientID) ?? [];
        const notFetchedStopIDs = subscribedStopIDs.filter(
            (stopID) => !departuresByStopID.has(stopID),
        );
        return notFetchedStopIDs;
    }

    const stopIDsByClientIDMapValues = subscribedStopIDsByClientID.values();
    return [...stopIDsByClientIDMapValues].flat();
};

/**
 * Return only the data that the client is subscribed to
 * as stringified object
 */
const getStringifiedDataForClientID = (clientID: string): string => {
    const clientsStopIDs = subscribedStopIDsByClientID.get(clientID)!;
    const dataForClientEntries = clientsStopIDs.map((stopID) => [
        stopID,
        departuresByStopID.get(stopID),
    ]);
    const dataForClient = Object.fromEntries(dataForClientEntries);
    return JSON.stringify(dataForClient);
};

const fetchData = async (clientID?: string) => {
    const stopIDsToFetch: string[] = getStopIDsToFetch(clientID);

    const res = await fetchApiData(stopIDsToFetch);
    /**
     * If there are no departures and clientID is not
     * provided, there is no need to update the state.
     */

    if (res.departures.length === 0) return;

    /**
     * update the state with the fetched departures
     */
    if (res.departures.length) {
        const resDeparturesByStopID = group(
            res.departures,
            (departure) => departure.stop.id,
        );

        const resDeparturesByStopIDEntries = Object.entries(
            resDeparturesByStopID,
        );
        resDeparturesByStopIDEntries.forEach(([stopID, departures = []]) => {
            const parsedDepartures = departures.map(getParsedDeparture);
            departuresByStopID.set(stopID, parsedDepartures);
        });
    }

    // If clientID is provided, send data only to the client
    if (clientID) {
        const ws = wsByClientID.get(clientID)!;
        ws.send(getStringifiedDataForClientID(clientID));
        return;
    }

    // If clientID is not provided, send data to all clients
    wsByClientID.forEach((ws, clientID) =>
        ws.send(getStringifiedDataForClientID(clientID)),
    );
};

const server = Bun.serve<ClientData>({
    port: 3001,
    async fetch(req, server) {
        const url = new URL(req.url);
        if (req.method === "GET" && url.pathname === "/departures") {
            const gtfsIDs = StopIDsSchema.safeParse(
                url.searchParams.getAll("gtfsID") ?? [],
            );
            if (!gtfsIDs.success) {
                return new Response(
                    `Invalid gtfsIDs: ` +
                        JSON.stringify(gtfsIDs.error, null, 2),
                    { status: 500 },
                );
            }

            const data = await fetchApiData(gtfsIDs.data);

            return new Response(JSON.stringify(data));
        }

        try {
            const stopIDsHeaderRaw = req.headers.get(STOP_IDS_HEADER) ?? "[]";
            const StopIDsHeaderParsed: unknown = JSON.parse(stopIDsHeaderRaw);
            const res = StopIDsSchema.safeParse(StopIDsHeaderParsed);
            if (!res.success) {
                throw (
                    `Invalid "${STOP_IDS_HEADER}" header: ` +
                    JSON.stringify(res.error.errors[0].message)
                );
            }

            const clientID = crypto.randomUUID();
            subscribedStopIDsByClientID.set(clientID, res.data);

            const success = server.upgrade(req, { data: { clientID } });
            if (!success) throw "Failed to upgrade connection";
        } catch (e) {
            return new Response(String(e), {
                status: 500,
                headers: [["error", String(e)]], // Postman doesn't show response body when testing websocket
            });
        }
    },
    websocket: {
        open(ws) {
            const clientID = ws.data.clientID;

            wsByClientID.set(clientID, ws);

            fetchData(clientID);

            if (intervalId !== null) return;

            const intervalObj = setInterval(fetchData, INTERVAL);
            intervalId = intervalObj[Symbol.toPrimitive]();
        },
        message(ws, message) {
            try {
                if (typeof message !== "string")
                    throw "Message has to be string";

                var StopIDsHeaderParsed: unknown = JSON.parse(message);
                const res = SubscribeSchema.safeParse(StopIDsHeaderParsed);
                if (!res.success)
                    throw JSON.stringify(res.error.errors[0].message);

                subscribedStopIDsByClientID.set(
                    ws.data.clientID,
                    res.data.subscribe,
                );
            } catch (e) {
                ws.close(1011, String(e));
            }
        },
        close(ws) {
            const clientID = ws.data.clientID;
            wsByClientID.delete(clientID);
            subscribedStopIDsByClientID.delete(clientID);

            const numOfsubscribedClients = subscribedStopIDsByClientID.size;
            if (numOfsubscribedClients > 0 || intervalId === null) return;

            clearInterval(intervalId);
            intervalId = null;
        },
    },
});

console.log(`Listening on ${server.hostname}:${server.port}`);
