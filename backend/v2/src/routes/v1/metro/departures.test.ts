const { describe, expect, test } = require("@jest/globals");

const PORT = 3002;
const ENDPOINT_URL = `http://localhost:${PORT}/v1/metro/departures`;

describe("server should not throw an error", () => {
    const invalidURLs = [
        ENDPOINT_URL,
        `${ENDPOINT_URL}?gtfsID`,
        `${ENDPOINT_URL}?gtfsID=`,
        `${ENDPOINT_URL}?gtfsID=&gtfsID=&gtfsID=`,
        `${ENDPOINT_URL}?gtfsID=[]&gtfsID=[]&gtfsID=[]`,
        `${ENDPOINT_URL}?gtfsID=U689z123P`,
        `${ENDPOINT_URL}?gtfsID=U689z123P&gtfsID=420&gtfsID=69`,
        `${ENDPOINT_URL}?gtfsID=U1040Z101P&gtfsID=U1040Z102P&gtfsID=U157Z101P&gtfsID=U157Z102P&gtfsID=U50Z101P&gtfsID=U50Z102P&gtfsID=U897Z101P&gtfsID=U510Z101P&gtfsID=U510Z102P&gtfsID=U321Z101P&gtfsID=U321Z102P&gtfsID=U1071Z101P&gtfsID=U1071Z102P&gtfsID=U1040Z102P&gtfsID=U157Z101P&gtfsID=U1040Z101P&gtfsID=U1040Z102P&gtfsID=U157Z101P&gtfsID=U1040Z101P&gtfsID=U1040Z102P&gtfsID=U157Z101P&gtfsID=U1040Z101P&gtfsID=U1040Z102P&gtfsID=U157Z101P&gtfsID=U1040Z101P&gtfsID=U1040Z102P&gtfsID=U118Z101P&gtfsID=U1154Z101P`,
    ];

    // run all tests multiple times to make sure caching doesn't break anything
    for (let i = 0; i < 5; i++) {
        invalidURLs.forEach((url) => {
            test(`iteration: ${i}, invalid url: ${url}`, async () => {
                const res = await fetch(url);

                expect(res.status).not.toBeGreaterThanOrEqual(500);
                expect(res.status).not.toBe(200);
            });
        });
    }
});

describe("server should return some data", () => {
    const validURLs = [
        `${ENDPOINT_URL}?gtfsID=U157Z101P`,
        `${ENDPOINT_URL}?gtfsID=U50Z101P&gtfsID=U50Z102P&gtfsID=U118Z101P`,
        `${ENDPOINT_URL}?gtfsID=U50Z101P`,
        `${ENDPOINT_URL}?gtfsID=U50Z101P&gtfsID=U118Z102P&gtfsID=U689Z101P`,
        `${ENDPOINT_URL}?gtfsID=U50Z101P&gtfsID=U50Z101P&gtfsID=U50Z101P`,
    ];

    // run all tests multiple times to make sure caching doesn't break anything
    for (let i = 0; i < 5; i++) {
        validURLs.forEach((url) => {
            test(`iteration: ${i}, valid url: ${url}`, async () => {
                const res = await fetch(url);

                expect(res.ok).toBe(true);
                expect(res.status).toBe(200);
            });
        });
    }
});
