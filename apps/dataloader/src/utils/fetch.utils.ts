const DEFAULT_TIMEOUT_MS = 30_000;

const formatFetchError = (url: URL | string, error: unknown): string => {
    if (error instanceof Error) {
        return `Failed to fetch '${url.toString()}': ${error.message}`;
    }

    return `Failed to fetch '${url.toString()}': ${String(error)}`;
};

export const fetchWithTimeout = async (
    url: URL | string,
    init: RequestInit = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> => {
    try {
        return await fetch(url, {
            ...init,
            signal: AbortSignal.timeout(timeoutMs),
        });
    } catch (error) {
        throw new Error(formatFetchError(url, error));
    }
};
