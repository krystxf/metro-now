import { Data, Effect } from "effect";

export class UpstreamError extends Data.TaggedError("UpstreamError")<{
    readonly service: string;
    readonly operation: string;
    readonly cause?: unknown;
    readonly status?: number;
}> {
    get message(): string {
        return `${this.service} ${this.operation} failed${this.status === undefined ? "" : ` (HTTP ${this.status})`}`;
    }
}

/** Validate HTTP status inside the typed error channel. */
export const fetchResponse = (
    service: string,
    url: string,
    init?: RequestInit,
): Effect.Effect<Response, UpstreamError> =>
    Effect.gen(function* () {
        const response = yield* Effect.tryPromise({
            try: (signal) => fetch(url, { ...init, signal }),
            catch: (cause) =>
                new UpstreamError({ service, operation: "request", cause }),
        });
        if (!response.ok) {
            return yield* Effect.fail(
                new UpstreamError({
                    service,
                    operation: "request",
                    status: response.status,
                }),
            );
        }
        return response;
    });

/** Fetch and decode inside the typed error channel; never cache a failed response. */
export const fetchJson = (
    service: string,
    url: string,
    init?: RequestInit,
): Effect.Effect<unknown, UpstreamError> =>
    fetchResponse(service, url, init).pipe(
        Effect.flatMap((response) =>
            Effect.tryPromise({
                try: () => response.json() as Promise<unknown>,
                catch: (cause) =>
                    new UpstreamError({
                        service,
                        operation: "JSON decoding",
                        cause,
                    }),
            }),
        ),
    );

/** Preserve typed errors at the NestJS Promise boundary instead of FiberFailure. */
export const runPromise = <A, E>(effect: Effect.Effect<A, E>): Promise<A> =>
    Effect.runPromise(
        Effect.match(effect, {
            onFailure: (error) => ({ ok: false as const, error }),
            onSuccess: (value) => ({ ok: true as const, value }),
        }),
    ).then((result) => {
        if (!result.ok) throw result.error;
        return result.value;
    });
