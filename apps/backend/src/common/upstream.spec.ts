import { UpstreamError, fetchJson, runPromise } from "./upstream";

describe("upstream effects", () => {
    afterEach(() => jest.restoreAllMocks());

    it("returns decoded JSON", async () => {
        jest.spyOn(global, "fetch").mockResolvedValue(
            new Response('{"ok":true}'),
        );
        await expect(
            runPromise(fetchJson("test", "https://example.com")),
        ).resolves.toEqual({ ok: true });
    });

    it("preserves HTTP failures at the Promise boundary", async () => {
        jest.spyOn(global, "fetch").mockResolvedValue(
            new Response("bad", { status: 503 }),
        );
        await expect(
            runPromise(fetchJson("test", "https://example.com")),
        ).rejects.toMatchObject({ _tag: "UpstreamError", status: 503 });
    });

    it.each(["network", "json"])("captures %s failures", async (failure) => {
        const cause = new Error("broken");
        const fetchMock = jest.spyOn(global, "fetch");
        if (failure === "network") fetchMock.mockRejectedValue(cause);
        else fetchMock.mockResolvedValue(new Response("invalid json"));
        await expect(
            runPromise(fetchJson("test", "https://example.com")),
        ).rejects.toBeInstanceOf(UpstreamError);
    });
});
