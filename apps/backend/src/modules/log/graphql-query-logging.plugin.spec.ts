import { getGraphQLQueryForRequestLog } from "src/modules/log/graphql-query-for-request-log.store";
import { GraphQLQueryLoggingPlugin } from "src/modules/log/graphql-query-logging.plugin";
import type { LogService } from "src/modules/log/log.service";

describe("GraphQLQueryLoggingPlugin", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("captures the GraphQL query and logs the request duration", async () => {
        const logService = {
            logGraphQLRequest: jest.fn(),
        } as unknown as jest.Mocked<LogService>;
        const plugin = new GraphQLQueryLoggingPlugin(logService);
        const req = {} as never;
        jest.spyOn(Date, "now")
            .mockReturnValueOnce(1_000)
            .mockReturnValueOnce(1_120);

        const listener = await plugin.requestDidStart({} as never);
        await listener.didEncounterErrors?.({
            errors: [{ message: "boom" }],
        } as never);
        await listener.willSendResponse?.({
            source: "query Test { ok }",
            request: {},
            contextValue: { req },
        } as never);

        expect(getGraphQLQueryForRequestLog(req)).toBe("query Test { ok }");
        expect(logService.logGraphQLRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                durationMs: 120,
                errors: [{ message: "boom" }],
            }),
        );
    });
});
