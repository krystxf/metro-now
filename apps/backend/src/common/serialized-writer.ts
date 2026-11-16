import { Data, Effect, Fiber, Ref } from "effect";

export class LogWriteError extends Data.TaggedError("LogWriteError")<{
    readonly cause: unknown;
}> {}

/** Serializes background writes and retains the latest fiber for shutdown. */
export class SerializedWriter {
    private readonly pending = Ref.unsafeMake<Fiber.RuntimeFiber<
        void,
        never
    > | null>(null);

    enqueue(
        write: () => Promise<unknown>,
        onError: (error: LogWriteError) => void,
    ): void {
        Effect.runSync(
            Ref.update(this.pending, (previous) =>
                Effect.runFork(
                    Effect.gen(function* () {
                        if (previous) yield* Fiber.join(previous);
                        yield* Effect.tryPromise({
                            try: write,
                            catch: (cause) => new LogWriteError({ cause }),
                        }).pipe(
                            Effect.catchTag("LogWriteError", (error) =>
                                Effect.sync(() => onError(error)),
                            ),
                        );
                    }),
                ),
            ),
        );
    }

    async flush(): Promise<void> {
        const pending = Effect.runSync(Ref.get(this.pending));
        if (pending) await Effect.runPromise(Fiber.join(pending));
    }
}
