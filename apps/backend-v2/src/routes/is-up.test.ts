const { describe, expect, test } = require("@jest/globals");

const ENDPOINT_URL = "http://localhost:3002/";

describe("is up", () => {
    test("status should be 200", async () => {
        const res = await fetch(ENDPOINT_URL);

        expect(res.status).toBe(200);
    });

    test("status should be OK", async () => {
        const res = await fetch(ENDPOINT_URL);

        expect(res.ok).toBe(true);
    });
});
