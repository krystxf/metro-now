import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import type { Cache } from "cache-manager";

import { CACHE_KEYS, CACHE_TTL } from "src/constants/cache";
import {
    type TransitlandStopDeparturesSchema,
    transitlandStopDeparturesSchema,
} from "src/modules/transitland/schema/transitland-stop-departures.schema";

const TRANSITLAND_API_URL = "https://transit.land/api/v2/rest";

@Injectable()
export class TransitlandService {
    constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

    async getStopDepartures({
        stopKey,
        params,
    }: {
        stopKey: string;
        params: Record<string, string | number | boolean | null | undefined>;
    }): Promise<TransitlandStopDeparturesSchema> {
        const apiKey = process.env.TRANSIT_LAND_API_KEY?.trim();

        if (!apiKey) {
            throw new Error(
                "TRANSIT_LAND_API_KEY is required for Leo departures",
            );
        }

        const searchParams = new URLSearchParams(
            Object.entries({
                apikey: apiKey,
                ...params,
            })
                .filter(([, value]) => value !== null && value !== undefined)
                .map(([key, value]) => [key, String(value)]),
        );
        const path = `/stops/${encodeURIComponent(stopKey)}/departures?${searchParams.toString()}`;

        return this.cacheManager.wrap(
            CACHE_KEYS.transitland.get(path),
            async () => {
                const response = await fetch(`${TRANSITLAND_API_URL}${path}`);

                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch Transitland data: ${response.status} ${response.statusText}`,
                    );
                }

                return transitlandStopDeparturesSchema.parse(
                    await response.json(),
                );
            },
            CACHE_TTL.transitlandDepartures,
        );
    }
}
