import type { Cache } from "@nestjs/cache-manager";

import type { DatabaseService } from "src/modules/database/database.service";
import { StopService } from "src/modules/stop/stop.service";

type QueryRow = Record<string, unknown>;

const getColumnKey = (column: string): string =>
    column.split(" as ")[0].split(".").at(-1)?.replaceAll('"', "") ?? column;

const getAliasKey = (column: string): string =>
    column.split(" as ").at(-1)?.replaceAll('"', "") ?? getColumnKey(column);

const createQueryBuilder = (rows: QueryRow[]) => {
    let currentRows = [...rows];
    let selectedColumns: string[] | null = null;
    let useDistinct = false;
    let offset = 0;
    let limit = Number.POSITIVE_INFINITY;

    const builder = {
        select(columns: string | string[]) {
            selectedColumns = Array.isArray(columns) ? columns : [columns];

            return builder;
        },
        innerJoin() {
            return builder;
        },
        where(column: string, operator: string, value: unknown) {
            const columnKey = getColumnKey(column);

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

            if (operator === "is not") {
                currentRows = currentRows.filter(
                    (row) => row[columnKey] !== value,
                );
            }

            return builder;
        },
        distinct() {
            useDistinct = true;

            return builder;
        },
        orderBy() {
            return builder;
        },
        offset(value: number) {
            offset = value;

            return builder;
        },
        limit(value: number) {
            limit = value;

            return builder;
        },
        $if(
            condition: boolean,
            callback: (qb: typeof builder) => typeof builder,
        ) {
            return condition ? callback(builder) : builder;
        },
        async execute() {
            let projectedRows = currentRows.map((row) => {
                if (!selectedColumns) {
                    return row;
                }

                return Object.fromEntries(
                    selectedColumns.map((column) => [
                        getAliasKey(column),
                        row[getColumnKey(column)],
                    ]),
                );
            });

            if (useDistinct) {
                projectedRows = Array.from(
                    new Map(
                        projectedRows.map((row) => [JSON.stringify(row), row]),
                    ).values(),
                );
            }

            return projectedRows.slice(offset, offset + limit);
        },
    };

    return builder;
};

describe("StopService", () => {
    const createService = () => {
        const rowsByTable: Record<string, QueryRow[]> = {
            Stop: [
                {
                    id: "U1072",
                    name: "Václavské náměstí",
                    avgLatitude: 50.0818176,
                    avgLongitude: 14.4255056,
                },
            ],
            Platform: [
                {
                    id: "U1072Z101P",
                    name: "Můstek",
                    code: null,
                    isMetro: true,
                    latitude: 50.08312,
                    longitude: 14.4249659,
                    stopId: "U1072",
                    routeName: "A",
                },
                {
                    id: "U1072Z1P",
                    name: "Václavské náměstí",
                    code: null,
                    isMetro: false,
                    latitude: 50.08167,
                    longitude: 14.4252787,
                    stopId: "U1072",
                    routeName: "176",
                },
            ],
            PlatformsOnRoutes: [
                {
                    platformId: "U1072Z101P",
                    routeId: "L991",
                    routeName: "A",
                },
                {
                    platformId: "U1072Z1P",
                    routeId: "L176",
                    routeName: "176",
                },
            ],
            GtfsStationEntrance: [
                {
                    id: "U1072E1",
                    stopId: "U1072",
                    name: "Můstek entrance A",
                    latitude: 50.08312,
                    longitude: 14.42496,
                },
            ],
        };

        const database = {
            db: {
                selectFrom(tableName: string) {
                    return createQueryBuilder(rowsByTable[tableName] ?? []);
                },
            },
        } as unknown as DatabaseService;

        const cacheManager = {
            wrap: jest.fn(async (_key: string, callback: () => unknown) =>
                callback(),
            ),
        } as unknown as Cache;

        return new StopService(database, cacheManager);
    };

    it("uses the metro platform name for metroOnly stop payloads", async () => {
        const service = createService();

        const [stop] = await service.getAll({ metroOnly: true });

        expect(stop).toMatchObject({
            id: "U1072",
            name: "Můstek",
            platforms: [
                expect.objectContaining({
                    id: "U1072Z101P",
                    isMetro: true,
                    name: "Můstek",
                }),
            ],
            entrances: [
                expect.objectContaining({
                    id: "U1072E1",
                    name: "Můstek entrance A",
                }),
            ],
        });
    });

    it("keeps the shared stop-group name for non-metro stop payloads", async () => {
        const service = createService();

        const [stop] = await service.getAll({ metroOnly: false });

        expect(stop).toMatchObject({
            id: "U1072",
            name: "Václavské náměstí",
        });
    });

    it("uses the metro station name and filters non-rail platforms for railOnly stop payloads", async () => {
        const service = createService();

        const [stop] = await service.getAll({
            metroOnly: false,
            railOnly: true,
        });

        expect(stop).toMatchObject({
            id: "U1072",
            name: "Můstek",
            platforms: [
                expect.objectContaining({
                    id: "U1072Z101P",
                    isMetro: true,
                    name: "Můstek",
                    routes: [
                        expect.objectContaining({
                            id: "L991",
                            name: "A",
                        }),
                    ],
                }),
            ],
        });
        expect(stop.platforms).toHaveLength(1);
    });
});
