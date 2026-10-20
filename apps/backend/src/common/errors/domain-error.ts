/**
 * Base class for domain-specific errors. Subclasses are tagged so callers and
 * exception filters can dispatch on type instead of parsing message strings.
 *
 * Today these classes only improve type ergonomics — there is no global filter
 * mapping them to specific HTTP/GraphQL codes yet. When the filter lands, it
 * will dispatch on `kind` and `code`.
 */
export abstract class DomainError extends Error {
    abstract readonly kind:
        | "validation"
        | "not-found"
        | "upstream"
        | "missing-data";

    constructor(
        message: string,
        readonly options: { code?: string; cause?: unknown } = {},
    ) {
        super(message);
        this.name = new.target.name;
        if (options.cause !== undefined) {
            (this as Error & { cause?: unknown }).cause = options.cause;
        }
    }
}

/**
 * Failure caused by a remote service we depend on (Golemio, Transitland, Leo
 * GTFS archive host, etc.). Maps to HTTP 502 / GraphQL `UPSTREAM_FAILED`.
 */
export class UpstreamError extends DomainError {
    readonly kind = "upstream" as const;
}

/**
 * Required data is absent (e.g. a CSV file inside a downloaded GTFS archive).
 * Distinct from `NotFoundError` because the cause is missing source data, not
 * a client looking up a non-existent record. Maps to HTTP 500 / GraphQL
 * `MISSING_DATA`.
 */
export class MissingDataError extends DomainError {
    readonly kind = "missing-data" as const;
}

/**
 * Input failed validation. Maps to HTTP 400 / GraphQL `BAD_USER_INPUT`.
 */
export class ValidationError extends DomainError {
    readonly kind = "validation" as const;
}

/**
 * A specific record was not found. Maps to HTTP 404 / GraphQL `NOT_FOUND`.
 */
export class NotFoundError extends DomainError {
    readonly kind = "not-found" as const;
}
