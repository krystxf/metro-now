import * as fs from "fs";

import { PrismaClient } from "@prisma/client";

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

const prisma = new PrismaClient();
async function main() {
    const stops = parseSeedFile<Stop[]>("./prisma/seeds/stops.json");
    const routes = parseSeedFile<Route[]>("./prisma/seeds/routes.json");
    const platforms = parseSeedFile<Platform[]>(
        "./prisma/seeds/platforms.json",
    );

    await prisma.$transaction(async (transaction) => {
        await transaction.platformsOnRoutes.deleteMany();
        await transaction.route.deleteMany();
        await transaction.platform.deleteMany();
        await transaction.stop.deleteMany();

        await transaction.stop.createMany({
            data: stops.map((stop) => ({
                id: stop.id,
                name: stop.name,
                avgLongitude: stop.avgLongitude,
                avgLatitude: stop.avgLatitude,
            })),
        });

        await transaction.platform.createMany({
            data: platforms.map((platform) => ({
                id: platform.id,
                name: platform.name,
                isMetro: platform.isMetro,
                latitude: platform.latitude,
                longitude: platform.longitude,
                stopId: platform.stopId ?? null,
            })),
        });

        await transaction.route.createMany({
            data: routes.map((platform) => ({
                id: platform.id,
                name: platform.name,
            })),
        });
    });
}
main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
