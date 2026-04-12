import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { CacheModule } from "@nestjs/cache-manager";
import { INestApplication } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
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
            const columnKey = column.split(".").at(-1) ?? column;

            if (operator === "in" && Array.isArray(value)) {
                currentRows = currentRows.filter((row) =>
                    value.includes(row[columnKey]),
                );
            }

            if (operator === "=") {
                currentRows = currentRows.filter(
                    (row) => row[columnKey] === value,
                );
            }

            return builder;
        },
        async execute() {
            return currentRows;
        },
    };

    return builder;
};

describe("Route GraphQL (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const mockDatabaseService = {
            db: {
                selectFrom(tableName: string) {
                    const rowsByTable: Record<string, QueryRow[]> = {
                        GtfsRoute: [
                            {
                                id: "L1",
                                feedId: "PID",
                                shortName: "C",
                                longName: "Line C",
                                isNight: false,
                                color: "E2001A",
                                url: "https://example.com/routes/L1",
                                type: "1",
                            },
                        ],
                        GtfsRouteStop: [],
                        GtfsRouteShape: [],
                    };

                    return createQueryBuilder(rowsByTable[tableName] ?? []);
                },
            },
        };

        const mockLeoGtfsService = {
            getRouteById: jest.fn(),
            getRoutesByIds: jest.fn(),
        };

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                CacheModule.register(cacheModuleConfig),
                DatabaseModule,
                GraphQLModule.forRoot<ApolloDriverConfig>({
                    driver: ApolloDriver,
                    path: "/graphql",
                    typePaths: ["./src/**/*.graphql"],
                    autoTransformHttpErrors: true,
                }),
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

    it("returns route color from GraphQL", async () => {
        const response = await request(app.getHttpServer())
            .post("/graphql")
            .send({
                query: `
                    query Route($id: ID!) {
                        route(id: $id) {
                            id
                            name
                            color
                        }
                    }
                `,
                variables: {
                    id: "1",
                },
            })
            .expect(200);

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.route).toEqual({
            id: "1",
            name: "C",
            color: "E2001A",
        });
    });
});
