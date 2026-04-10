import type { LogEntry, LogTransport } from "src/utils/logger";
import { logger } from "src/utils/logger";

class TestTransport implements LogTransport {
    readonly entries: LogEntry[] = [];

    async write(entry: LogEntry): Promise<void> {
        this.entries.push(entry);
    }

    async flush(): Promise<void> {}
}

describe("logger", () => {
    it("writes entries to the configured transport", async () => {
        const transport = new TestTransport();

        logger.setTransport(transport);
        logger.info("hello", { foo: "bar" });
        await logger.flush();
        logger.setTransport(null);

        expect(transport.entries).toHaveLength(1);
        expect(transport.entries[0]?.level).toBe("info");
        expect(transport.entries[0]?.message).toBe("hello");
        expect(transport.entries[0]?.context).toEqual({ foo: "bar" });
    });
});
