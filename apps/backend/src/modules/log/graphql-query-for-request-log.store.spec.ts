import {
    getGraphQLQueryForRequestLog,
    graphqlQueryFromHttpRequest,
    setGraphQLQueryForRequestLog,
} from "src/modules/log/graphql-query-for-request-log.store";

describe("graphql-query-for-request-log.store", () => {
    it("stores non-empty GraphQL queries on the request object", () => {
        const req = {} as never;

        setGraphQLQueryForRequestLog(req, "");
        expect(getGraphQLQueryForRequestLog(req)).toBeNull();

        setGraphQLQueryForRequestLog(req, "query Test { ok }");
        expect(getGraphQLQueryForRequestLog(req)).toBe("query Test { ok }");
    });

    it("extracts GraphQL queries from HTTP GET, POST, and batch requests", () => {
        expect(
            graphqlQueryFromHttpRequest({
                path: "/graphql",
                method: "GET",
                query: { query: "query Get { ok }" },
            } as never),
        ).toBe("query Get { ok }");

        expect(
            graphqlQueryFromHttpRequest({
                path: "/graphql",
                method: "POST",
                body: { query: "query Post { ok }" },
            } as never),
        ).toBe("query Post { ok }");

        expect(
            graphqlQueryFromHttpRequest({
                path: "/graphql",
                method: "POST",
                body: [
                    { query: "query A { ok }" },
                    { query: "query B { ok }" },
                ],
            } as never),
        ).toBe("query A { ok }\n---\nquery B { ok }");
    });

    it("returns null for non-GraphQL or unsupported HTTP requests", () => {
        expect(
            graphqlQueryFromHttpRequest({
                path: "/status",
                method: "GET",
                query: { query: "query Get { ok }" },
            } as never),
        ).toBeNull();
        expect(
            graphqlQueryFromHttpRequest({
                path: "/graphql",
                method: "PUT",
                body: { query: "query Put { ok }" },
            } as never),
        ).toBeNull();
    });
});
