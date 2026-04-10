import type { PlatformsByStopLoader } from "src/modules/dataloader/platforms-by-stop.loader";
import type { RouteByIdLoader } from "src/modules/dataloader/route-by-id.loader";
import { DepartureResolver } from "src/modules/departure/departure.resolver";
import type { DepartureServiceV2 } from "src/modules/departure/departure-v2.service";

describe("DepartureResolver", () => {
    it("maps Leo departures into GraphQL route and platform references", async () => {
        const departureServiceV2 = {
            getDepartures: jest.fn(async () => [
                {
                    id: "leo-1",
                    departure: {
                        predicted: "2026-04-09T10:00:00Z",
                        scheduled: "2026-04-09T10:00:00Z",
                    },
                    delay: 0,
                    headsign: "Praha hl.n.",
                    route: "LE 100",
                    routeId: "LTL:route-a",
                    platformId: "TLP:platform-a",
                    platformCode: null,
                    isRealtime: false,
                },
            ]),
        } as unknown as DepartureServiceV2;
        const platformByIdLoader = {
            load: jest.fn(async (id: string) => ({ id })),
        } as unknown as PlatformsByStopLoader;
        const routeByIdLoader = {
            load: jest.fn(async (id: string) => ({ id })),
        } as unknown as RouteByIdLoader;
        const resolver = new DepartureResolver(
            departureServiceV2,
            platformByIdLoader,
            routeByIdLoader,
        );

        const [departure] = await resolver.getMultiple([], ["TLS:station-a"], 5);

        expect(departure).toMatchObject({
            route: { id: "LTL:route-a" },
            platform: { id: "TLP:platform-a" },
            headsign: "Praha hl.n.",
            delay: 0,
            isRealtime: false,
        });
        await expect(
            resolver.getPlatformField({ platform: { id: "TLP:platform-a" } } as never),
        ).resolves.toEqual({ id: "TLP:platform-a" });
        await expect(
            resolver.getRouteField({ route: { id: "LTL:route-a" } } as never),
        ).resolves.toEqual({ id: "LTL:route-a" });
    });
});
