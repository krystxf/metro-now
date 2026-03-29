import * as fs from "fs";

import type {
    MetroNowDatabase,
    NewPlatform,
    NewRoute,
    NewStop,
} from "./index";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

type Stop = {
    id: string;
    name: string;
    avgLatitude: number;
    avgLongitude: number;
};

type Route = {
    id: string;
    name: string;
    isNight: boolean | null;
    vehicleType: null;
};

type Platform = {
    id: string;
    name: string;
    isMetro: boolean;
    latitude: number;
    longitude: number;
    stopId: string;
};

const parseSeedFile = <T>(path: string): T => {
    const raw = fs.readFileSync(path).toString();

    return JSON.parse(raw);
};

async function main() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error("DATABASE_URL environment variable is required");
    }

    const db = new Kysely<MetroNowDatabase>({
        dialect: new PostgresDialect({
            pool: new Pool({ connectionString }),
        }),
    });

    const stops = parseSeedFile<Stop[]>("./seeds/stops.json");
    const routes = parseSeedFile<Route[]>("./seeds/routes.json");
    const platforms = parseSeedFile<Platform[]>("./seeds/platforms.json");

    await db.transaction().execute(async (transaction) => {
        await transaction.deleteFrom("PlatformsOnRoutes").execute();
        await transaction.deleteFrom("Route").execute();
        await transaction.deleteFrom("Platform").execute();
        await transaction.deleteFrom("Stop").execute();

        const timestamp = new Date();

        if (stops.length > 0) {
            const stopValues: NewStop[] = stops.map((stop) => ({
                id: stop.id,
                name: stop.name,
                avgLatitude: stop.avgLatitude,
                avgLongitude: stop.avgLongitude,
                createdAt: timestamp,
                updatedAt: timestamp,
            }));

            await transaction.insertInto("Stop").values(stopValues).execute();
        }

        if (platforms.length > 0) {
            const platformValues: NewPlatform[] = platforms.map((platform) => ({
                id: platform.id,
                name: platform.name,
                isMetro: platform.isMetro,
                latitude: platform.latitude,
                longitude: platform.longitude,
                stopId: platform.stopId ?? null,
                code: null,
                createdAt: timestamp,
                updatedAt: timestamp,
            }));

            await transaction
                .insertInto("Platform")
                .values(platformValues)
                .execute();
        }

        if (routes.length > 0) {
            const routeValues: NewRoute[] = routes.map((route) => ({
                id: route.id,
                name: route.name,
                vehicleType: null,
                isNight: null,
                createdAt: timestamp,
                updatedAt: timestamp,
            }));

            await transaction
                .insertInto("Route")
                .values(routeValues)
                .execute();
        }
    });

    await db.destroy();
}

main()
    .then(() => {
        console.log("Seed completed successfully");
    })
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
