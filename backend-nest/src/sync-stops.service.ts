import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { getGolemioHeaders } from "src/utils/fetch";
import { PrismaService } from "./prisma.service";

@Injectable()
export class SyncStopsService {
    constructor(private prisma: PrismaService) {}

    @Cron("0 0 */2 * *")
    async handleCron() {
        console.log("Syncing stops...");
        const stops = await syncStops();

        for (const stop of stops) {
            await this.prisma.stop.upsert({
                where: { id: stop.id },
                update: stop,
                create: stop,
            });
        }
    }
}

const syncStops = async (): Promise<
    {
        id: string;
        name: string;
        latitude: number;
        longitude: number;
    }[]
> => {
    const data = [];
    const LIMIT = 10_000;

    for (let offset = 0; offset < 30_000; offset += LIMIT) {
        const res = await fetch(
            `https://api.golemio.cz/v2/gtfs/stops?offset=${offset}`,
            {
                method: "GET",
                headers: getGolemioHeaders(),
            },
        );

        data.push(...(await res.json()).features);
    }

    const parsed = data
        .map((stop) => ({
            latitude: stop.geometry.coordinates[1],
            longitude: stop.geometry.coordinates[0],
            id: stop.properties.stop_id,
            name: stop.properties.stop_name,
        }))
        .filter(
            (stop) =>
                !!stop.latitude && !!stop.longitude && !!stop.id && !!stop.name,
        );

    return parsed;
};
