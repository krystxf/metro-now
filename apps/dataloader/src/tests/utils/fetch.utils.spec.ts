import assert from "node:assert/strict";
import test from "node:test";

import { fetchWithTimeout } from "../../utils/fetch.utils";

test("fetchWithTimeout wraps network errors with the URL", async () => {
    await assert.rejects(
        () => fetchWithTimeout("http://0.0.0.0:1/nonexistent", {}, 100),
        (error: Error) => {
            assert.match(
                error.message,
                /Failed to fetch 'http:\/\/0\.0\.0\.0:1\/nonexistent'/,
            );

            return true;
        },
    );
});

test("fetchWithTimeout wraps timeout errors with the URL", async () => {
    await assert.rejects(
        () => fetchWithTimeout("http://192.0.2.1:1/timeout", {}, 1),
        (error: Error) => {
            assert.match(
                error.message,
                /Failed to fetch 'http:\/\/192\.0\.2\.1:1\/timeout'/,
            );

            return true;
        },
    );
});
