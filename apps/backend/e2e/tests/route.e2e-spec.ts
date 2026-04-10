import { CacheModule } from "@nestjs/cache-manager";
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";

import { cacheModuleConfig } from "src/config/cache-module.config";
import { DatabaseModule } from "src/modules/database/database.module";
import { DatabaseService } from "src/modules/database/database.service";
import { LeoGtfsService } from "src/modules/leo/leo-gtfs.service";
import { RouteModule } from "src/modules/route/route.module";

type QueryRow = Record<string, unknown>;

const createQueryBuilder = (rows: QueryRow[]) => {
    let currentRows = [...rows];

    const builder = {
        distinct() {
            return builder;
        },
        leftJoin() {
            return builder;
        },
        orderBy() {
            return builder;
        },
        select() {
            return builder;
        },
        where(column: string, operator: string, value: unknown) {
            if (operator === "in" && Array.isArray(value)) {
                const columnKey = column.split(".").at(-1) ?? column;

                currentRows = currentRows.filter((row) =>
                    value.includes(row[columnKey]),
                );
            }

            if (operator === "=") {
                const columnKey = column.split(".").at(-1) ?? column;

                currentRows = currentRows.filter(
                    (row) => row[columnKey] === value,
                );
            }

            return builder;
        },
        async execute() {
            return currentRows;
        },
        async executeTakeFirst() {
            return currentRows[0];
        },
    };

    return builder;
};

describe("Route Module (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const mockDatabaseService = {
            db: {
                selectFrom(tableName: string) {
                    const rowsByTable: Record<string, QueryRow[]> = {
                        GtfsRoute: [
                            {
                                id: "L1",
                                shortName: "C",
                                longName: "Line C",
                                isNight: false,
                                color: "E2001A",
                                url: "https://example.com/routes/L1",
                                type: "1",
                            },
                        ],
                        GtfsRouteStop: [
                            {
                                routeId: "L1",
                                directionId: "0",
                                stopSequence: 1,
                                platformId: "P1",
                                platformLatitude: 50.1,
                                platformLongitude: 14.4,
                                platformName: "Platform 1",
                                platformIsMetro: true,
                                platformCode: "1",
                            },
                        ],
                        GtfsRouteShape: [
                            {
                                routeId: "L1",
                                directionId: "0",
                                shapeId: "shape-1",
                                tripCount: 12,
                                isPrimary: true,
                                geoJson: {
                                    type: "LineString",
                                    coordinates: [
                                        [14.4, 50.1],
                                        [14.5, 50.2],
                                    ],
                                },
                            },
                        ],
                    };

                    return createQueryBuilder(rowsByTable[tableName] ?? []);
                },
            },
        };
        const leoRouteLtl252 = {
            id: "LTL:252",
            shortName: "LE 1215",
            longName: "Leo Express",
            color: "000000",
            url: null,
            type: "100",
            directions: [
                {
                    id: "0",
                    platforms: [
                        {
                            id: "TLP:5457076",
                            latitude: 50.083875,
                            longitude: 14.435949,
                            name: "Praha hl.n.",
                            isMetro: false,
                            code: null,
                        },
                    ],
                },
            ],
            shapes: [
                {
                    id: "generated:252:0",
                    directionId: "0",
                    tripCount: 2,
                    geoJson: JSON.stringify({
                        type: "LineString",
                        coordinates: [
                            [14.435949, 50.083875],
                            [17.185, 49.593],
                        ],
                    }),
                    points: [
                        {
                            latitude: 50.083875,
                            longitude: 14.435949,
                        },
                        {
                            latitude: 49.593,
                            longitude: 17.185,
                        },
                    ],
                },
            ],
        };

        const mockLeoGtfsService = {
            getRouteById(id: string) {
                return Promise.resolve(
                    id === "LTL:252" ? leoRouteLtl252 : null,
                );
            },
            getRoutesByIds(ids: readonly string[]) {
                return Promise.resolve(
                    ids.includes("LTL:252") ? [leoRouteLtl252] : [],
                );
            },
            getRoutes() {
                return Promise.resolve([]);
            },
            getRoutesByPlatformIds() {
                return Promise.resolve(new Map());
            },
        };

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                CacheModule.register(cacheModuleConfig),
                DatabaseModule,
                RouteModule,
            ],
        })
            .overrideProvider(DatabaseService)
            .useValue(mockDatabaseService)
            .overrideProvider(LeoGtfsService)
            .useValue(mockLeoGtfsService)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it("returns a route with shapes", async () => {
        const response = await request(app.getHttpServer())
            .get("/route/L1")
            .expect(200)
            .accept("application/json");

        expect(response.body).toBeDefined();
        expect(response.body.id).toBe("1");
        expect(response.body.directions).toEqual([
            {
                id: "0",
                platforms: [
                    {
                        id: "P1",
                        latitude: 50.1,
                        longitude: 14.4,
                        name: "Platform 1",
                        isMetro: true,
                        code: "1",
                    },
                ],
            },
        ]);
        expect(response.body.shapes).toEqual([
            {
                id: "shape-1",
                directionId: "0",
                tripCount: 12,
                geoJson: JSON.stringify({
                    type: "LineString",
                    coordinates: [
                        [14.4, 50.1],
                        [14.5, 50.2],
                    ],
                }),
                points: [
                    {
                        latitude: 50.1,
                        longitude: 14.4,
                    },
                    {
                        latitude: 50.2,
                        longitude: 14.5,
                    },
                ],
            },
        ]);
    });

    it("returns a Leo route by its provider-aware id", async () => {
        const response = await request(app.getHttpServer())
            .get("/route/LTL:252")
            .expect(200)
            .accept("application/json");

        expect(response.body).toMatchObject({
            id: "LTL:252",
            shortName: "LE 1215",
            longName: "Leo Express",
            type: "100",
            directions: [
                {
                    id: "0",
                    platforms: [
                        expect.objectContaining({
                            id: "TLP:5457076",
                            name: "Praha hl.n.",
                        }),
                    ],
                },
            ],
            shapes: [
                expect.objectContaining({
                    id: "generated:252:0",
                    directionId: "0",
                    tripCount: 2,
                }),
            ],
        });
    });
});
