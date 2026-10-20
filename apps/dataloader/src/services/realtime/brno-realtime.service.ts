import type Redis from "ioredis";

import { fetchWithTimeout } from "../../utils/fetch.utils";
import { logger } from "../../utils/logger";
import type {
    BrnoRealtimeData,
    BrnoRealtimeStatus,
    BrnoVehicle,
    KordisQueryResponse,
} from "./brno-realtime.types";

const KORDIS_VEHICLE_API =
    "https://gis.brno.cz/ags1/rest/services/Hosted/Kordis_26_polohy/FeatureServer/0/query";

const POLL_INTERVAL_MS = 30_000;
const REDIS_KEY = "brno:rt:delays";
const REDIS_TTL_SECONDS = 120;
const FETCH_TIMEOUT_MS = 15_000;

export class BrnoRealtimeService {
    private interval: ReturnType<typeof setInterval> | null = null;
    private redis: Redis | null = null;
    private lastUpdateAt: Date | null = null;
    private lastError: string | null = null;
    private vehicleCount = 0;
    private routeCount = 0;

    start(redis: Redis): void {
        this.redis = redis;
        this.interval = setInterval(() => {
            void this.poll();
        }, POLL_INTERVAL_MS);

        void this.poll();

        logger.info("Brno realtime polling started", {
            intervalMs: POLL_INTERVAL_MS,
            redisTtl: REDIS_TTL_SECONDS,
        });
    }

    stop(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        logger.info("Brno realtime polling stopped");
    }

    getStatus(): BrnoRealtimeStatus {
        return {
            polling: this.interval !== null,
            lastUpdateAt: this.lastUpdateAt?.toISOString() ?? null,
            lastError: this.lastError,
            vehicleCount: this.vehicleCount,
            routeCount: this.routeCount,
        };
    }

    private async poll(): Promise<void> {
        try {
            const response = await this.fetchVehicles();
            const data = this.buildRealtimeData(response);

            await this.writeToRedis(data);

            this.lastUpdateAt = new Date();
            this.lastError = null;
            this.vehicleCount = data.vehicles.length;
            this.routeCount = new Set(data.vehicles.map((v) => v.line)).size;
        } catch (error) {
            this.lastError =
                error instanceof Error ? error.message : String(error);
            logger.warn("Brno realtime poll failed", {
                error: this.lastError,
            });
        }
    }

    private async fetchVehicles(): Promise<KordisQueryResponse> {
        const url = new URL(KORDIS_VEHICLE_API);

        url.searchParams.set("where", "IsInactive='false'");
        url.searchParams.set(
            "outFields",
            "LineName,Delay,LastStopID,FinalStopID",
        );
        url.searchParams.set("f", "json");
        url.searchParams.set("resultRecordCount", "5000");

        const response = await fetchWithTimeout(
            url,
            undefined,
            FETCH_TIMEOUT_MS,
        );

        if (!response.ok) {
            throw new Error(
                `KORDIS API returned ${response.status} ${response.statusText}`,
            );
        }

        const data = (await response.json()) as KordisQueryResponse;

        if (!Array.isArray(data.features)) {
            throw new Error("KORDIS API response missing features array");
        }

        return data;
    }

    private buildRealtimeData(response: KordisQueryResponse): BrnoRealtimeData {
        const vehicles: BrnoVehicle[] = [];

        for (const feature of response.features) {
            const { LineName, Delay, LastStopID, FinalStopID } =
                feature.attributes;

            if (
                !LineName ||
                typeof Delay !== "number" ||
                typeof LastStopID !== "number" ||
                typeof FinalStopID !== "number"
            ) {
                continue;
            }

            vehicles.push({
                line: LineName,
                delay: Math.round(Delay * 60),
                lastStop: LastStopID,
                finalStop: FinalStopID,
            });
        }

        return {
            updatedAt: new Date().toISOString(),
            vehicles,
        };
    }

    private async writeToRedis(data: BrnoRealtimeData): Promise<void> {
        if (!this.redis) {
            return;
        }

        await this.redis.set(
            REDIS_KEY,
            JSON.stringify(data),
            "EX",
            REDIS_TTL_SECONDS,
        );
    }
}
