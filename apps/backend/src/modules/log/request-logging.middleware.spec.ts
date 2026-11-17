import { setGraphQLQueryForRequestLog } from "src/modules/log/graphql-query-for-request-log.store";
import type { RequestLogService } from "src/modules/log/request-log.service";
import { RequestLoggingMiddleware } from "src/modules/log/request-logging.middleware";

describe("RequestLoggingMiddleware", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("logs filtered request metadata and stored GraphQL queries on response finish", () => {
        const requestLogService = {
            log: jest.fn(),
        } as unknown as jest.Mocked<RequestLogService>;
        const middleware = new RequestLoggingMiddleware(requestLogService);
        const finishHandlers: Array<() => void> = [];
        const req = {
            method: "POST",
            originalUrl: "/graphql",
            path: "/graphql",
            headers: {
                authorization: "secret",
                cookie: "session=1",
                "x-app-version": "1.2.3",
                "user-agent": "jest",
                "x-extra": "ok",
            },
            body: { query: "query Fallback { ok }" },
        } as never;
        const res = {
            statusCode: 200,
            on: jest.fn((event: string, cb: () => void) => {
                if (event === "finish") {
                    finishHandlers.push(cb);
                }
            }),
            getHeader: jest.fn().mockReturnValue("HIT"),
        } as never;
        const next = jest.fn();
        jest.spyOn(Date, "now")
            .mockReturnValueOnce(1_000)
            .mockReturnValueOnce(1_045);
        setGraphQLQueryForRequestLog(req, "query Stored { ok }");

        middleware.use(req, res, next);
        finishHandlers[0]();

        expect(next).toHaveBeenCalledTimes(1);
        expect(requestLogService.log).toHaveBeenCalledWith({
            method: "POST",
            path: "/graphql",
            statusCode: 200,
            durationMs: 45,
            cached: true,
            userAgent: "jest",
            appVersion: "1.2.3",
            headers: {
                "user-agent": "jest",
                "x-app-version": "1.2.3",
                "x-extra": "ok",
            },
            graphqlQuery: "query Stored { ok }",
        });
    });

    it("falls back to extracting the GraphQL query from the HTTP request", () => {
        const requestLogService = {
            log: jest.fn(),
        } as unknown as jest.Mocked<RequestLogService>;
        const middleware = new RequestLoggingMiddleware(requestLogService);
        let finishHandler: (() => void) | undefined;
        const req = {
            method: "POST",
            originalUrl: "/graphql",
            path: "/graphql",
            headers: {},
            body: [{ query: "query A { ok }" }, { query: "query B { ok }" }],
        } as never;
        const res = {
            statusCode: 204,
            on: jest.fn((event: string, cb: () => void) => {
                if (event === "finish") {
                    finishHandler = cb;
                }
            }),
            getHeader: jest.fn().mockReturnValue(undefined),
        } as never;

        middleware.use(req, res, jest.fn());
        finishHandler?.();

        expect(requestLogService.log).toHaveBeenCalledWith(
            expect.objectContaining({
                graphqlQuery: "query A { ok }\n---\nquery B { ok }",
                cached: false,
            }),
        );
    });
});
