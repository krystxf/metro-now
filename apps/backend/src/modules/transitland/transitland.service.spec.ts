import { TransitlandService } from "./transitland.service";

describe("Transitland effects", () => {
    const originalKey = process.env.TRANSIT_LAND_API_KEY;
    afterEach(() => {
        jest.restoreAllMocks();
        if (originalKey === undefined)
            Reflect.deleteProperty(process.env, "TRANSIT_LAND_API_KEY");
        else process.env.TRANSIT_LAND_API_KEY = originalKey;
    });
    const createService = () =>
        new TransitlandService({
            wrap: (_key: string, load: () => Promise<unknown>) => load(),
        } as never);

    it("decodes successful responses", async () => {
        process.env.TRANSIT_LAND_API_KEY = "key";
        jest.spyOn(global, "fetch").mockResolvedValue(
            new Response('{"stops":[],"extra":true}'),
        );
        await expect(
            createService().getStopDepartures({ stopKey: "stop", params: {} }),
        ).resolves.toEqual({ stops: [] });
    });
    it("reports schema failures as typed upstream errors", async () => {
        process.env.TRANSIT_LAND_API_KEY = "key";
        jest.spyOn(global, "fetch").mockResolvedValue(
            new Response('{"stops":"invalid"}'),
        );
        await expect(
            createService().getStopDepartures({ stopKey: "stop", params: {} }),
        ).rejects.toMatchObject({
            _tag: "UpstreamError",
            service: "Transitland",
            operation: "response validation",
        });
    });
    it("rejects missing configuration before fetching", async () => {
        Reflect.deleteProperty(process.env, "TRANSIT_LAND_API_KEY");
        const fetchMock = jest.spyOn(global, "fetch");
        await expect(
            createService().getStopDepartures({ stopKey: "stop", params: {} }),
        ).rejects.toMatchObject({ _tag: "UpstreamError" });
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
