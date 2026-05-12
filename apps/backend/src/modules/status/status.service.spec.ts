import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";

import { DatabaseService } from "src/modules/database/database.service";
import { StatusService } from "src/modules/status/status.service";
import {
    SystemStatus,
    SystemStatusService,
} from "src/modules/status/status.types";

const createCountDb = (counts: Record<string, number>) => ({
    selectFrom: jest.fn((table: string) => ({
        select: jest.fn((selection) => {
            if (typeof selection === "function") {
                selection({
                    fn: {
                        countAll: () => ({
                            as: () => "count",
                        }),
                    },
                });
            }

            return {
                executeTakeFirstOrThrow: jest.fn().mockResolvedValue({
                    count: counts[table] ?? 0,
                }),
            };
        }),
    })),
});

describe("StatusService", () => {
    it("returns OK backend status immediately", async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                StatusService,
                {
                    provide: DatabaseService,
                    useValue: {
                        db: createCountDb({}),
                        getExtensionNames: jest.fn(),
                    },
                },
                {
                    provide: CACHE_MANAGER,
                    useValue: { wrap: jest.fn() },
                },
            ],
        }).compile();
        const service = moduleRef.get(StatusService);

        expect(service.getBackendStatus()).toEqual({
            service: SystemStatusService.BACKEND,
            status: SystemStatus.OK,
        });
    });

    it("reports geo function health based on required extensions", async () => {
        const database = {
            db: createCountDb({}),
            getExtensionNames: jest
                .fn()
                .mockResolvedValueOnce(["cube", "earthdistance"])
                .mockResolvedValueOnce(["cube"]),
        };
        const cacheManager = {
            wrap: jest.fn(async (_key, callback) => callback()),
        };
        const moduleRef = await Test.createTestingModule({
            providers: [
                StatusService,
                {
                    provide: DatabaseService,
                    useValue: database,
                },
                {
                    provide: CACHE_MANAGER,
                    useValue: cacheManager,
                },
            ],
        }).compile();
        const service = moduleRef.get(StatusService);

        await expect(service.getGeoFunctionsStatus()).resolves.toEqual({
            service: SystemStatusService.GEO_FUNCTIONS,
            status: SystemStatus.OK,
        });
        await expect(service.getGeoFunctionsStatus()).resolves.toEqual({
            service: SystemStatusService.GEO_FUNCTIONS,
            status: SystemStatus.ERROR,
        });
    });

    it("reports DB status based on stop, route, and platform counts", async () => {
        const cacheManager = {
            wrap: jest.fn(async (_key, callback) => callback()),
        };
        const okModule = await Test.createTestingModule({
            providers: [
                StatusService,
                {
                    provide: DatabaseService,
                    useValue: {
                        db: createCountDb({
                            Stop: 1,
                            GtfsRoute: 2,
                            Platform: 3,
                        }),
                        getExtensionNames: jest.fn(),
                    },
                },
                {
                    provide: CACHE_MANAGER,
                    useValue: cacheManager,
                },
            ],
        }).compile();
        const errorModule = await Test.createTestingModule({
            providers: [
                StatusService,
                {
                    provide: DatabaseService,
                    useValue: {
                        db: createCountDb({
                            Stop: 1,
                            GtfsRoute: 0,
                            Platform: 3,
                        }),
                        getExtensionNames: jest.fn(),
                    },
                },
                {
                    provide: CACHE_MANAGER,
                    useValue: cacheManager,
                },
            ],
        }).compile();

        await expect(
            okModule.get(StatusService).getDbDataStatus(),
        ).resolves.toEqual({
            service: SystemStatusService.DB_DATA,
            status: SystemStatus.OK,
        });
        await expect(
            errorModule.get(StatusService).getDbDataStatus(),
        ).resolves.toEqual({
            service: SystemStatusService.DB_DATA,
            status: SystemStatus.ERROR,
        });
    });
});
