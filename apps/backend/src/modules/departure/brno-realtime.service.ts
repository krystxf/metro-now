import {
    Injectable,
    type OnModuleDestroy,
    type OnModuleInit,
} from "@nestjs/common";
import Redis from "ioredis";

const REDIS_KEY = "brno:rt:delays";
const KORDIS_STOP_PATTERN = /^BRP:U(\d+)/;

type BrnoVehicle = {
    line: string;
    delay: number;
    lastStop: number;
    finalStop: number;
};

type BrnoRealtimeData = {
    updatedAt: string;
    vehicles: BrnoVehicle[];
};

type RouteStopSequence = {
    kordisStops: number[];
    terminal: number;
};

export type BrnoRouteStopRow = {
    routeId: string;
    directionId: string;
    stopId: string;
    stopSequence: number;
};

@Injectable()
export class BrnoRealtimeService implements OnModuleInit, OnModuleDestroy {
    private redis!: Redis;

    onModuleInit(): void {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || "localhost",
            port: Number.parseInt(process.env.REDIS_PORT || "6379"),
            lazyConnect: false,
            maxRetriesPerRequest: 1,
        });
    }

    async onModuleDestroy(): Promise<void> {
        await this.redis.quit();
    }

    async getVehicles(): Promise<Map<string, BrnoVehicle[]> | null> {
        try {
            const raw = await this.redis.get(REDIS_KEY);

            if (!raw) {
                return null;
            }

            const data = JSON.parse(raw) as BrnoRealtimeData;
            const byLine = new Map<string, BrnoVehicle[]>();

            for (const vehicle of data.vehicles) {
                const list = byLine.get(vehicle.line) ?? [];

                list.push(vehicle);
                byLine.set(vehicle.line, list);
            }

            return byLine;
        } catch {
            return null;
        }
    }

    buildStopSequences(
        rows: BrnoRouteStopRow[],
    ): Map<string, RouteStopSequence> {
        const map = new Map<string, RouteStopSequence>();

        const grouped = new Map<string, BrnoRouteStopRow[]>();

        for (const row of rows) {
            const key = `${row.routeId}::${row.directionId}`;
            const list = grouped.get(key) ?? [];

            list.push(row);
            grouped.set(key, list);
        }

        for (const [key, stops] of grouped) {
            const sorted = stops.sort(
                (a, b) => a.stopSequence - b.stopSequence,
            );
            const kordisStops: number[] = [];

            for (const stop of sorted) {
                const num = extractKordisStopNumber(stop.stopId);

                if (num !== null) {
                    kordisStops.push(num);
                }
            }

            if (kordisStops.length > 0) {
                map.set(key, {
                    kordisStops,
                    terminal: kordisStops[kordisStops.length - 1],
                });
            }
        }

        return map;
    }

    findVehicleDelay(args: {
        vehiclesOnLine: BrnoVehicle[];
        stopSequences: Map<string, RouteStopSequence>;
        routeId: string;
        directionId: string;
        kordisStopNumber: number;
    }): number | null {
        const key = `${args.routeId}::${args.directionId}`;
        const sequence = args.stopSequences.get(key);

        if (!sequence) {
            return null;
        }

        const stopPosition = sequence.kordisStops.indexOf(
            args.kordisStopNumber,
        );

        if (stopPosition === -1) {
            return null;
        }

        const sameDirection = args.vehiclesOnLine.filter(
            (v) => v.finalStop === sequence.terminal,
        );

        if (sameDirection.length === 0) {
            return null;
        }

        let bestVehicle: BrnoVehicle | null = null;
        let bestPosition = -1;

        for (const vehicle of sameDirection) {
            const vehiclePosition = sequence.kordisStops.indexOf(
                vehicle.lastStop,
            );

            if (
                vehiclePosition !== -1 &&
                vehiclePosition <= stopPosition &&
                vehiclePosition > bestPosition
            ) {
                bestPosition = vehiclePosition;
                bestVehicle = vehicle;
            }
        }

        if (bestVehicle) {
            return bestVehicle.delay;
        }

        const totalDelay = sameDirection.reduce((sum, v) => sum + v.delay, 0);

        return Math.round(totalDelay / sameDirection.length);
    }
}

export const extractKordisStopNumber = (platformId: string): number | null => {
    const match = KORDIS_STOP_PATTERN.exec(platformId);

    return match ? Number(match[1]) : null;
};
