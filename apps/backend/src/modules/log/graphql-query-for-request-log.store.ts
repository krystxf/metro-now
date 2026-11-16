import type { Request } from "express";

import { GRAPHQL_PATH } from "src/constants/api";

const graphqlQueryByRequest = new WeakMap<Request, string>();

export function setGraphQLQueryForRequestLog(
    req: Request,
    query: string | null,
): void {
    if (query === null || query === "") {
        return;
    }
    graphqlQueryByRequest.set(req, query);
}

export function getGraphQLQueryForRequestLog(req: Request): string | null {
    return graphqlQueryByRequest.get(req) ?? null;
}

/** Fallback when Apollo has not attached a query (e.g. tests without the plugin). */
export function graphqlQueryFromHttpRequest(req: Request): string | null {
    if (req.path !== GRAPHQL_PATH) {
        return null;
    }
    if (req.method === "GET") {
        const q = req.query.query;
        return typeof q === "string" ? q : null;
    }
    if (req.method !== "POST") {
        return null;
    }
    const body = req.body;
    if (!body || typeof body !== "object") {
        return null;
    }
    if (Array.isArray(body)) {
        const queries = body
            .map((item) =>
                item?.query && typeof item.query === "string"
                    ? item.query
                    : null,
            )
            .filter((q): q is string => Boolean(q));
        return queries.length > 0 ? queries.join("\n---\n") : null;
    }
    return typeof body.query === "string" ? body.query : null;
}
