import type { DatabaseService } from "src/modules/database/database.service";
import { RequestLogService } from "src/modules/log/request-log.service";

describe("RequestLogService", () => {
    it("persists request logs with a generated createdAt timestamp", async () => {
        const execute = jest.fn().mockResolvedValue(undefined);
        const database = {
            db: {
                insertInto: jest.fn().mockReturnValue({
                    values: jest.fn().mockReturnValue({
                        execute,
                    }),
                }),
            },
        } as unknown as jest.Mocked<DatabaseService>;
        const service = new RequestLogService(database);

        service.log({
            method: "GET",
            path: "/status",
            statusCode: 200,
            durationMs: 10,
            cached: false,
            userAgent: null,
            appVersion: null,
            headers: {},
            graphqlQuery: null,
        });
        await service.flush();

        expect(database.db.insertInto).toHaveBeenCalledWith("RequestLog");
        expect(execute).toHaveBeenCalledTimes(1);
    });

    it("swallows write errors after logging them", async () => {
        const consoleError = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});
        const execute = jest.fn().mockRejectedValue(new Error("insert failed"));
        const database = {
            db: {
                insertInto: jest.fn().mockReturnValue({
                    values: jest.fn().mockReturnValue({
                        execute,
                    }),
                }),
            },
        } as unknown as jest.Mocked<DatabaseService>;
        const service = new RequestLogService(database);

        service.log({
            method: "GET",
            path: "/status",
            statusCode: 500,
            durationMs: 10,
            cached: false,
            userAgent: null,
            appVersion: null,
            headers: {},
            graphqlQuery: null,
        });
        await service.onModuleDestroy();

        expect(consoleError).toHaveBeenCalledWith(
            "Failed to write request log",
            {
                error: "insert failed",
            },
        );
    });
});
