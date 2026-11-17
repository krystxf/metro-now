const RETRYABLE_ERRNO_CODES = new Set([
    "ECONNRESET",
    "ETIMEDOUT",
    "ECONNREFUSED",
    "EPIPE",
    "ENOTFOUND",
    "EAI_AGAIN",
]);

export const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
};

export const isRetryableFetchError = (error: unknown): boolean => {
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

    if (maybeErrno.code && RETRYABLE_ERRNO_CODES.has(maybeErrno.code)) {
        return true;
    }

    return "cause" in error && isRetryableFetchError(error.cause);
};
