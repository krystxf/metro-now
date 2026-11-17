import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import type { Cache } from "cache-manager";

import { fetchJson, runPromise } from "src/common/upstream";

import { CACHE_KEYS, CACHE_TTL } from "src/constants/cache";

const GOLEMIO_API = "https://api.golemio.cz";

const getTtlForPath = (path: string): number => {
    if (path.startsWith("/v2/pid/departureboards")) {
        return CACHE_TTL.golemioDepartureBoards;
    }

    return CACHE_TTL.golemioDefault;
};

@Injectable()
export class GolemioService {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

    async getGolemioData(path: string): Promise<unknown> {
        const url = `${GOLEMIO_API}${path}`;

        return this.cacheManager.wrap(
            CACHE_KEYS.golemio.getGolemioData(path),
            () =>
                runPromise(
                    fetchJson("Golemio", url, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Access-Token": process.env.GOLEMIO_API_KEY ?? "",
                        },
                    }),
                ),
            getTtlForPath(path),
        );
    }
}
