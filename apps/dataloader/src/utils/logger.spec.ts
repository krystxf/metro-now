import assert from "node:assert/strict";
import test from "node:test";

import type { LogEntry, LogTransport } from "./logger";
import { logger } from "./logger";

class TestTransport implements LogTransport {
    readonly entries: LogEntry[] = [];

    async write(entry: LogEntry): Promise<void> {
        this.entries.push(entry);
    }

    async flush(): Promise<void> {}
}

test("logger writes entries to the configured transport", async () => {
    const transport = new TestTransport();

    logger.setTransport(transport);
    logger.info("hello", { foo: "bar" });
    await logger.flush();
    logger.setTransport(null);

    assert.equal(transport.entries.length, 1);
    assert.equal(transport.entries[0]?.level, "info");
    assert.equal(transport.entries[0]?.message, "hello");
    assert.deepEqual(transport.entries[0]?.context, { foo: "bar" });
});
