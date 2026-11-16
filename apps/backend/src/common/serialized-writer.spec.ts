import { SerializedWriter } from "./serialized-writer";

describe("SerializedWriter", () => {
    it("keeps writes ordered and waits for pending work on flush", async () => {
        const writer = new SerializedWriter();
        const events: string[] = [];
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        const onError = jest.fn();
        writer.enqueue(async () => {
            events.push("first started");
            await gate;
            events.push("first ended");
        }, onError);
        writer.enqueue(async () => {
            events.push("second");
        }, onError);
        const flushed = writer.flush().then(() => events.push("flushed"));
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(events).toEqual(["first started"]);
        release();
        await flushed;
        expect(events).toEqual([
            "first started",
            "first ended",
            "second",
            "flushed",
        ]);
        expect(onError).not.toHaveBeenCalled();
    });

    it("reports failures without preventing subsequent writes", async () => {
        const writer = new SerializedWriter();
        const cause = new Error("database unavailable");
        const onError = jest.fn();
        const write = jest.fn().mockResolvedValue(undefined);
        writer.enqueue(() => Promise.reject(cause), onError);
        writer.enqueue(write, onError);
        await writer.flush();
        expect(onError).toHaveBeenCalledWith(
            expect.objectContaining({ _tag: "LogWriteError", cause }),
        );
        expect(write).toHaveBeenCalledTimes(1);
        await new SerializedWriter().flush();
    });
});
