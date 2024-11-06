import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import { Cache } from "cache-manager";

const TTL = 4 * 1_000;
const GOLEMIO_API = "https://api.golemio.cz";

@Injectable()
export class GolemioService {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

    async getGolemioData(path: string): Promise<Response> {
        const url = `${GOLEMIO_API}${path}`;

        const cached = await this.cacheManager.get(url);

        if (cached) {
            return new Response(JSON.stringify(cached));
        }

        const res = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-Access-Token": process.env.GOLEMIO_API_KEY ?? "",
            },
        });

        if (res.ok) {
            const parsed = await res.clone().json();
            await this.cacheManager.set(url, parsed, TTL);
        }

        return res;
    }
}
