// Convert an object into URLSearchParams-compatible entries, dropping
// null/undefined values and stringifying the rest.
export const searchParamsEntries = (
    params: Record<string, unknown>,
): [string, string][] =>
    Object.entries(params)
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([key, value]) => [key, String(value)]);
