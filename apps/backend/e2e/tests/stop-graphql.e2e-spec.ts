import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { CacheModule } from "@nestjs/cache-manager";
import { INestApplication } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";

import { cacheModuleConfig } from "src/config/cache-module.config";
import { DatabaseModule } from "src/modules/database/database.module";
import { DatabaseService } from "src/modules/database/database.service";
import { StopModule } from "src/modules/stop/stop.module";

type QueryRow = Record<string, unknown>;

const createQueryBuilder = (rows: QueryRow[]) => {
    let currentRows = [...rows];

    const builder = {
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

describe("Stop GraphQL (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const mockDatabaseService = {
            db: {
                selectFrom(tableName: string) {
                    const rowsByTable: Record<string, QueryRow[]> = {
                        Stop: [
                            {
                                id: "U1072",
                                name: "Mustek",
                                avgLatitude: 50.08353,
                                avgLongitude: 14.42456,
                            },
                        ],
                        GtfsStationEntrance: [
                            {
                                id: "U1072E1",
                                stopId: "U1072",
                                name: "Mustek entrance A",
                                latitude: 50.08312,
                                longitude: 14.42496,
                            },
                            {
                                id: "U1072E2",
                                stopId: "U1072",
                                name: "Mustek entrance B",
                                latitude: 50.08394,
                                longitude: 14.42415,
                            },
                        ],
                        Platform: [],
                    };

                    return createQueryBuilder(rowsByTable[tableName] ?? []);
                },
            },
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
                StopModule,
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

    it("returns stop entrances from GraphQL", async () => {
        const response = await request(app.getHttpServer())
            .post("/graphql")
            .send({
                query: `
                    query StopEntrances($id: ID!) {
                        stop(id: $id) {
                            id
                            name
                            entrances {
                                id
                                name
                                latitude
                                longitude
                            }
                        }
                    }
                `,
                variables: {
                    id: "U1072",
                },
            })
            .expect(200);

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.stop).toEqual({
            id: "U1072",
            name: "Mustek",
            entrances: [
                {
                    id: "U1072E1",
                    name: "Mustek entrance A",
                    latitude: 50.08312,
                    longitude: 14.42496,
                },
                {
                    id: "U1072E2",
                    name: "Mustek entrance B",
                    latitude: 50.08394,
                    longitude: 14.42415,
                },
            ],
        });
    });
});
