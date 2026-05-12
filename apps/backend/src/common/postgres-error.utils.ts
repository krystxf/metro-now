// Postgres SQLSTATE codes (https://www.postgresql.org/docs/current/errcodes-appendix.html)
export const POSTGRES_UNDEFINED_TABLE = "42P01";
export const POSTGRES_UNDEFINED_COLUMN = "42703";

export const hasPostgresErrorCode = (
    error: unknown,
    codes: readonly string[],
): boolean =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    codes.includes((error as { code: string }).code);
