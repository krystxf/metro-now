import type { ServerWebSocket } from "bun";
import type { ClientData, Departure } from "./types";

import { v4 as uuid } from "uuid";
import { group } from "radash";

import { STOP_IDS_HEADER, INTERVAL } from "./server/server.const";
import { fetchApiData } from "./fetch-metro/fetch-metro";
import { StopIDsSchema, SubscribeSchema, type ApiResponse } from "./schemas";
import { getParsedDeparture } from "./server/server.utils";

if (!process.env.GOLEMIO_API_KEY) {
  throw new Error("GOLEMIO_API_KEY is not set");
}

let intervalId: number | null = null;

const subscribedStopIDsByClientID = new Map<string, string[]>();
const wsByClientID = new Map<string, ServerWebSocket<ClientData>>();

const departuresByStopID = new Map<string, Departure[]>();

const getAllSubscribedStopIDs = (): string[] => {
  const stopIDsByClientIDMapValues = subscribedStopIDsByClientID.values();
  return Array.from(stopIDsByClientIDMapValues).flat();
};

const fetchData = async (clientID?: string) => {
  /**
   * If clientID is provided, fetch only the stopIDs that the client is subscribed to
   * and that haven't been fetched yet.
   *
   * Otherwise, refetch all stopIDs that are subscribed by any client.
   */
  const stopIDsToFetch: string[] = clientID
    ? subscribedStopIDsByClientID
        .get(clientID)!
        .filter((stopID) => !departuresByStopID.has(stopID))
    : getAllSubscribedStopIDs();

  const res = await fetchApiData(stopIDsToFetch);
  /**
   * If there are no departures and clientID is not
   * provided, there is no need to update the state.
   */
  if (!res.departures.length && !clientID) return;

  /**
   * update the state with the fetched departures
   */
  if (res.departures.length) {
    const resDeparturesByStopID = group(
      res.departures,
      (departure) => departure.stop.id
    );

    const resDeparturesByStopIDEntries = Object.entries(resDeparturesByStopID);
    resDeparturesByStopIDEntries.forEach(([stopID, departures = []]) => {
      const parsedDepartures = departures.map(getParsedDeparture);
      departuresByStopID.set(stopID, parsedDepartures);
    });
  }

  /**
   * Return only the data that the client is subscribed to
   * as stringified object
   */
  const getStringifiedDataForClientID = (clientID: string): string => {
    const stopIDsSubscribedByClient =
      subscribedStopIDsByClientID.get(clientID)!;
    const dataForClient = Object.fromEntries(
      stopIDsSubscribedByClient.map((stopID) => [
        stopID,
        departuresByStopID.get(stopID),
      ])
    );
    return JSON.stringify(dataForClient);
  };

  /**
   * If clientID is provided, send data to the client
   */
  if (clientID) {
    const ws = wsByClientID.get(clientID)!;

    ws.send(getStringifiedDataForClientID(clientID));

    return;
  }

  /**
   * If clientID is not provided, send data to all clients
   */
  wsByClientID.forEach((ws, clientID) =>
    ws.send(getStringifiedDataForClientID(clientID))
  );
};

const server = Bun.serve<ClientData>({
  fetch(req, server) {
    const stopIDsHeaderRaw = req.headers.get(STOP_IDS_HEADER);
    const StopIDsHeaderParsed = JSON.parse(stopIDsHeaderRaw ?? "");
    const res = StopIDsSchema.safeParse(StopIDsHeaderParsed);

    if (!res.success) return new Response("Invalid request", { status: 400 });

    const clientID = uuid();
    subscribedStopIDsByClientID.set(clientID, res.data);
    const success = server.upgrade(req, { data: { clientID } });

    if (!success)
      return new Response("Failed to upgrade connection", { status: 500 });
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
      const res = SubscribeSchema.safeParse(message);
      if (!res.success) return;

      subscribedStopIDsByClientID.set(ws.data.clientID, res.data.subscribe);
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
