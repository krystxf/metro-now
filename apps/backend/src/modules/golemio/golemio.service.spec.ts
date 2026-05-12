import type { Cache } from "@nestjs/cache-manager";

import { GolemioService } from "src/modules/golemio/golemio.service";

type MockCache = Pick<Cache, "wrap"> & {
    wrap: jest.Mock;
};

describe("GolemioService", () => {
    const originalFetch = global.fetch;

    const createService = () => {
        const cacheManager: MockCache = {
            wrap: jest.fn(async (_key, callback) => await callback()),
        };

        const service = new GolemioService(cacheManager as unknown as Cache);

        return {
            service,
            cacheManager,
        };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it("retries transient fetch errors once before succeeding", async () => {
        const retryableError = Object.assign(new TypeError("fetch failed"), {
            cause: Object.assign(new Error("read ECONNRESET"), {
                code: "ECONNRESET",
            }),
        });

        global.fetch = jest
            .fn()
            .mockRejectedValueOnce(retryableError)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ok: true }),
            } as Response) as typeof fetch;

        const { service, cacheManager } = createService();

        await expect(
            service.getGolemioData("/v3/pid/infotexts"),
        ).resolves.toEqual({ ok: true });

        expect(cacheManager.wrap).toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("does not retry non-retryable HTTP errors", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 404,
            statusText: "Not Found",
        } as Response) as typeof fetch;

        const { service } = createService();

        await expect(
            service.getGolemioData("/v3/pid/infotexts"),
        ).rejects.toThrow("Failed to fetch Golemio data: 404 Not Found");

        expect(global.fetch).toHaveBeenCalledTimes(1);
    });
});
