import type { Cache } from "@nestjs/cache-manager";

import { CACHE_KEYS, CACHE_TTL } from "src/constants/cache";
import { GolemioService } from "src/modules/golemio/golemio.service";
import { InfotextsService } from "src/modules/infotexts/infotexts.service";

type MockCache = Pick<Cache, "wrap" | "get" | "set"> & {
    wrap: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
};

type MockGolemioService = {
    getGolemioData: jest.Mock<Promise<unknown>, [string]>;
};

describe("InfotextsService", () => {
    const golemioInfotextsResponse = [
        {
            id: "58d0c029-b296-48ab-b458-521dcbb37224",
            text: "Escalator unavailable",
            text_en: "Escalator unavailable",
            priority: "high",
            display_type: "warning",
            related_stops: [
                {
                    id: "U337Z12P",
                    name: "Lihovar",
                    platform_code: "D",
                },
            ],
            valid_from: "2026-04-20T08:00:00.000Z",
            valid_to: "2026-04-20T20:00:00.000Z",
        },
    ];

    const parsedInfotexts = [
        {
            id: "58d0c029-b296-48ab-b458-521dcbb37224",
            text: "Escalator unavailable",
            textEn: "Escalator unavailable",
            priority: "HIGH" as const,
            displayType: "warning",
            relatedStops: [
                {
                    id: "U337Z12P",
                    name: "Lihovar",
                    platformCode: "D",
                },
            ],
            validFrom: "2026-04-20T08:00:00.000Z",
            validTo: "2026-04-20T20:00:00.000Z",
        },
    ];

    const createService = () => {
        const golemioService: MockGolemioService = {
            getGolemioData: jest.fn(),
        };

        const cacheManager: MockCache = {
            wrap: jest.fn(async (_key, callback) => await callback()),
            get: jest.fn(),
            set: jest.fn(),
        };

        const service = new InfotextsService(
            golemioService as unknown as GolemioService,
            cacheManager as unknown as Cache,
        );

        return {
            service,
            golemioService,
            cacheManager,
        };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("stores the latest successful response as infotexts fallback data", async () => {
        const { service, golemioService, cacheManager } = createService();
        golemioService.getGolemioData.mockResolvedValue(
            golemioInfotextsResponse,
        );

        await expect(service.getAll()).resolves.toEqual(parsedInfotexts);

        expect(cacheManager.wrap).toHaveBeenCalledWith(
            CACHE_KEYS.infotexts.getAll,
            expect.any(Function),
            CACHE_TTL.infotexts,
        );
        expect(cacheManager.set).toHaveBeenCalledWith(
            CACHE_KEYS.infotexts.getAllFallback,
            parsedInfotexts,
            CACHE_TTL.infotextsFallback,
        );
    });

    it("returns stale infotexts when the upstream request fails", async () => {
        const { service, golemioService, cacheManager } = createService();
        golemioService.getGolemioData.mockRejectedValue(
            new Error("read ECONNRESET"),
        );
        cacheManager.get.mockResolvedValue(parsedInfotexts);

        await expect(service.getAll()).resolves.toEqual(parsedInfotexts);

        expect(cacheManager.get).toHaveBeenCalledWith(
            CACHE_KEYS.infotexts.getAllFallback,
        );
    });

    it("returns an empty list when the upstream request fails without fallback data", async () => {
        const { service, golemioService, cacheManager } = createService();
        golemioService.getGolemioData.mockRejectedValue(
            new Error("read ECONNRESET"),
        );
        cacheManager.get.mockResolvedValue(undefined);

        await expect(service.getAll()).resolves.toEqual([]);
    });
});
