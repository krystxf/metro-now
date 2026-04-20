import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Cache } from "cache-manager";

import { CACHE_KEYS, CACHE_TTL } from "src/constants/cache";

const GOLEMIO_API = "https://api.golemio.cz";
const GOLEMIO_MAX_ATTEMPTS = 2;
const GOLEMIO_REQUEST_TIMEOUT_MS = 10_000;
const GOLEMIO_RETRY_DELAY_MS = 250;
const GOLEMIO_RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
};

const isRetryableFetchError = (error: unknown): boolean => {
    if (
        error instanceof Error &&
        "name" in error &&
        error.name === "AbortError"
    ) {
        return true;
    }

    if (!(error instanceof Error)) {
        return false;
    }

    const maybeErrno = error as NodeJS.ErrnoException;
    if (
        maybeErrno.code &&
        [
            "ECONNRESET",
            "ETIMEDOUT",
            "ECONNREFUSED",
            "EPIPE",
            "ENOTFOUND",
            "EAI_AGAIN",
        ].includes(maybeErrno.code)
    ) {
        return true;
    }

    return "cause" in error && isRetryableFetchError(error.cause);
};

const wait = async (ms: number): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, ms));
};

const getTtlForPath = (path: string): number => {
    if (path.startsWith("/v2/pid/departureboards")) {
        return CACHE_TTL.golemioDepartureBoards;
    }

    return CACHE_TTL.golemioDefault;
};

@Injectable()
export class GolemioService {
    private readonly logger = new Logger(GolemioService.name);

    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

    private async fetchJson(url: string): Promise<unknown> {
        for (let attempt = 1; attempt <= GOLEMIO_MAX_ATTEMPTS; attempt += 1) {
            const controller = new AbortController();
            const timeout = setTimeout(
                () => controller.abort(),
                GOLEMIO_REQUEST_TIMEOUT_MS,
            );

            try {
                const res = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Access-Token": process.env.GOLEMIO_API_KEY ?? "",
                    },
                    signal: controller.signal,
                });

                if (!res.ok) {
                    const message = `Failed to fetch Golemio data: ${res.status} ${res.statusText}`;

                    if (
                        attempt < GOLEMIO_MAX_ATTEMPTS &&
                        GOLEMIO_RETRYABLE_STATUS_CODES.has(res.status)
                    ) {
                        this.logger.warn(
                            `${message}; retrying ${url} (${attempt}/${GOLEMIO_MAX_ATTEMPTS})`,
                        );
                        await wait(GOLEMIO_RETRY_DELAY_MS);
                        continue;
                    }

                    throw new Error(message);
                }

                return await res.json();
            } catch (error) {
                if (
                    attempt >= GOLEMIO_MAX_ATTEMPTS ||
                    !isRetryableFetchError(error)
                ) {
                    throw error;
                }

                this.logger.warn(
                    `Retrying ${url} after transient Golemio fetch error (${attempt}/${GOLEMIO_MAX_ATTEMPTS}): ${getErrorMessage(error)}`,
                );
                await wait(GOLEMIO_RETRY_DELAY_MS);
            } finally {
                clearTimeout(timeout);
            }
        }

        throw new Error(`Exhausted Golemio fetch retries for ${url}`);
    }

    async getGolemioData(path: string): Promise<unknown> {
        const url = `${GOLEMIO_API}${path}`;

        return this.cacheManager.wrap(
            CACHE_KEYS.golemio.getGolemioData(path),
            async () => await this.fetchJson(url),
            getTtlForPath(path),
        );
    }
}
