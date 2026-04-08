import { CacheModule } from "@nestjs/cache-manager";
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";

import { cacheModuleConfig } from "src/config/cache-module.config";
import { DatabaseModule } from "src/modules/database/database.module";
import { DatabaseService } from "src/modules/database/database.service";
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

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                CacheModule.register(cacheModuleConfig),
                DatabaseModule,
                RouteModule,
            ],
        })
            .overrideProvider(DatabaseService)
            .useValue(mockDatabaseService)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it("returns a route with shapes", async () => {
        const response = await request(app.getHttpAdapter().getInstance())
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
});
