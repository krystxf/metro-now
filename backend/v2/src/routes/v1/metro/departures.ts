import { Router } from "express";
import { createClient } from "redis";
import { zodGtfsID } from "../../../validation/metro";
import { unique, group } from "radash";

export const departuresRoute = Router();

const departuresScheme = zodGtfsID.or(zodGtfsID.array().max(10));

const GOLEMIO_ENDPOINT = new URL(
    "/v2/pid/departureboards",
    "https://api.golemio.cz",
);
const GOLEMIO_ENDPOINT_HEADERS = new Headers({
    "Content-Type": "application/json",
    "X-Access-Token": process.env.GOLEMIO_API_KEY!,
});

departuresRoute.get("/departures", async (req, res) => {
    const parsedGtfsIDsQuery = departuresScheme.safeParse(req.query?.gtfsID);
    if (!parsedGtfsIDsQuery.success) {
        res.status(400).send(parsedGtfsIDsQuery.error.errors);
        return;
    }
    const parsedGtfsIDs = Array.isArray(parsedGtfsIDsQuery.data)
        ? parsedGtfsIDsQuery.data
        : [parsedGtfsIDsQuery.data];

    const redisClient = createClient();
    await redisClient.connect();

    const data: Record<string, any> = {};
    const uniqueGtfsIDs = unique(parsedGtfsIDs);

    await Promise.all(
        uniqueGtfsIDs.map(async (gtfsID) => {
            const raw = await redisClient.get(gtfsID);
            data[gtfsID] = raw ? JSON.parse(raw) : null;
        }),
    );

    const notCachedGtfsIDs: string[] = Object.entries(data)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

    if (notCachedGtfsIDs.length) {
        const response = await fetch(
            new URL(
                `${GOLEMIO_ENDPOINT}?total=100&includeMetroTrains=true&minutesAfter=600&${notCachedGtfsIDs.map((id) => `ids[]=${id}`).join("&")}`,
            ),
            {
                method: "GET",
                headers: GOLEMIO_ENDPOINT_HEADERS,
            },
        );

        const parsed = await response.json();
        const departuresByGtfsID = group(
            parsed.departures,
            (departure: any) => departure.stop.id,
        );
        await Promise.all(
            Object.entries(departuresByGtfsID).map(async ([key, value]) => {
                data[key] = value;
                await redisClient.set(key, JSON.stringify(value), {
                    EX: 60,
                });
            }),
        );
    }

    await redisClient.quit();
    res.json(data);
});
