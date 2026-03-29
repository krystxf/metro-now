import type { GraphQLRequestContextWillSendResponse } from "@apollo/server";

import { LogService } from "src/modules/log/log.service";

describe("LogService", () => {
    it("stores GraphQL request logs in the database log table", async () => {
        const execute = jest.fn().mockResolvedValue(undefined);
        const values = jest.fn().mockReturnValue({ execute });
        const insertInto = jest.fn().mockReturnValue({ values });
        const logService = new LogService({
            db: {
                insertInto,
            },
        } as never);

        logService.logGraphQLRequest({
            durationMs: 42,
            requestContext: {
                operationName: "Stops",
                operation: {
                    operation: "query",
                },
                queryHash: "abc123",
                request: {
                    query: "query Stops { stops { id } }",
                    operationName: "Stops",
                    variables: {
                        limit: 5,
                    },
                    http: {
                        method: "POST",
                        search: "",
                        headers: new Headers({
                            "user-agent": "jest",
                        }) as never,
                    },
                },
                requestIsBatched: false,
                response: {
                    body: {
                        kind: "single",
                        singleResult: {
                            data: {
                                stops: [],
                            },
                        },
                    },
                    http: {},
                },
                source: "query Stops { stops { id } }",
            } as unknown as GraphQLRequestContextWillSendResponse<never>,
        });

        await logService.flush();

        expect(insertInto).toHaveBeenCalledWith("Log");
        expect(values).toHaveBeenCalledWith(
            expect.objectContaining({
                service: "backend",
                level: "info",
                message: "GraphQL request completed",
                context: expect.objectContaining({
                    operationName: "Stops",
                    operationType: "query",
                    durationMs: 42,
                    queryHash: "abc123",
                }),
            }),
        );
        expect(execute).toHaveBeenCalledTimes(1);
    });
});
