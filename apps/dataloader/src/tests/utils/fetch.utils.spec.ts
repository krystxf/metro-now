import { fetchWithTimeout } from "src/utils/fetch.utils";

describe("fetchWithTimeout", () => {
    it("wraps network errors with the URL", async () => {
        await expect(
            fetchWithTimeout("http://0.0.0.0:1/nonexistent", {}, 100),
        ).rejects.toThrow(
            /Failed to fetch 'http:\/\/0\.0\.0\.0:1\/nonexistent'/,
        );
    });

    it("wraps timeout errors with the URL", async () => {
        await expect(
            fetchWithTimeout("http://192.0.2.1:1/timeout", {}, 1),
        ).rejects.toThrow(/Failed to fetch 'http:\/\/192\.0\.2\.1:1\/timeout'/);
    });
});
