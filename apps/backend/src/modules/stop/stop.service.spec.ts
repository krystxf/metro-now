import type { Cache } from "@nestjs/cache-manager";

import type { DatabaseService } from "src/modules/database/database.service";
import { StopService } from "src/modules/stop/stop.service";

type QueryRow = Record<string, unknown>;

const getColumnKey = (column: string): string =>
    column.split(" as ")[0].split(".").at(-1)?.replaceAll('"', "") ?? column;

const getAliasKey = (column: string): string =>
    column.split(" as ").at(-1)?.replaceAll('"', "") ?? getColumnKey(column);

const escapeForRegex = (value: string): string =>
    value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sqlPatternToRegExp = (pattern: string): RegExp => {
    let regex = "";
    let isEscaped = false;

    for (const char of pattern) {
        if (isEscaped) {
            regex += escapeForRegex(char);
            isEscaped = false;
            continue;
        }

        if (char === "\\") {
            isEscaped = true;
            continue;
        }

        if (char === "%") {
            regex += ".*";
            continue;
        }

        if (char === "_") {
            regex += ".";
            continue;
        }

        regex += escapeForRegex(char);
    }

    if (isEscaped) {
        regex += "\\\\";
    }

    return new RegExp(`^${regex}$`, "i");
};

const createQueryBuilder = (rows: QueryRow[]) => {
    let currentRows = [...rows];
    let selectedColumns: string[] | null = null;
    let useDistinct = false;
    let offset = 0;
    let limit = Number.POSITIVE_INFINITY;
    const orderBys: { columnKey: string; direction: "asc" | "desc" }[] = [];

    const builder = {
        select(columns: string | string[]) {
            selectedColumns = Array.isArray(columns) ? columns : [columns];

            return builder;
        },
        innerJoin() {
            return builder;
        },
        leftJoin() {
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

            if (operator === "ilike" && typeof value === "string") {
                const pattern = sqlPatternToRegExp(value);

                currentRows = currentRows.filter((row) => {
                    const rowValue = row[columnKey];

                    return (
                        typeof rowValue === "string" && pattern.test(rowValue)
                    );
                });
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
        orderBy(column: string, direction: "asc" | "desc" = "asc") {
            orderBys.push({
                columnKey: getColumnKey(column),
                direction,
            });

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
            const orderedRows = [...currentRows].sort((left, right) => {
                for (const { columnKey, direction } of orderBys) {
                    const leftValue = left[columnKey];
                    const rightValue = right[columnKey];

                    if (leftValue === rightValue) {
                        continue;
                    }

                    if (
                        typeof leftValue === "string" &&
                        typeof rightValue === "string"
                    ) {
                        const comparison = leftValue.localeCompare(rightValue);

                        return direction === "asc" ? comparison : -comparison;
                    }

                    if (leftValue == null) {
                        return direction === "asc" ? -1 : 1;
                    }

                    if (rightValue == null) {
                        return direction === "asc" ? 1 : -1;
                    }

                    if (leftValue < rightValue) {
                        return direction === "asc" ? -1 : 1;
                    }

                    if (leftValue > rightValue) {
                        return direction === "asc" ? 1 : -1;
                    }
                }

                return 0;
            });

            let projectedRows = orderedRows.map((row) => {
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
    const createService = ({
        extraStops = [],
        extraPlatforms = [],
        extraPlatformsOnRoutes = [],
        extraEntrances = [],
    }: {
        extraStops?: QueryRow[];
        extraPlatforms?: QueryRow[];
        extraPlatformsOnRoutes?: QueryRow[];
        extraEntrances?: QueryRow[];
    } = {}) => {
        const rowsByTable: Record<string, QueryRow[]> = {
            Stop: [
                {
                    id: "U1072",
                    name: "Václavské náměstí",
                    avgLatitude: 50.0818176,
                    avgLongitude: 14.4255056,
                },
                ...extraStops,
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
                ...extraPlatforms,
            ],
            PlatformsOnRoutes: [
                {
                    platformId: "U1072Z101P",
                    routeId: "L991",
                    routeName: "A",
                    id: "L991",
                    name: "A",
                },
                {
                    platformId: "U1072Z1P",
                    routeId: "L176",
                    routeName: "176",
                    id: "L176",
                    name: "176",
                },
                ...extraPlatformsOnRoutes,
            ],
            GtfsStationEntrance: [
                {
                    id: "U1072E1",
                    stopId: "U1072",
                    name: "Můstek entrance A",
                    latitude: 50.08312,
                    longitude: 14.42496,
                },
                ...extraEntrances,
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

    it("includes Leo platforms linked to local stops from the database", async () => {
        const service = createService({
            extraPlatforms: [
                {
                    id: "TLP:leo-1",
                    name: "Václavské náměstí",
                    code: null,
                    isMetro: false,
                    latitude: 50.0819,
                    longitude: 14.4256,
                    stopId: "U1072",
                    routeName: "LE 100",
                },
            ],
            extraPlatformsOnRoutes: [
                {
                    platformId: "TLP:leo-1",
                    routeId: "LTL:leo-route",
                    routeName: "LE 100",
                    id: "LTL:leo-route",
                    name: "LE 100",
                },
            ],
        });

        const stop = await service.getOneById("U1072");

        expect(stop).toMatchObject({
            id: "U1072",
            platforms: expect.arrayContaining([
                expect.objectContaining({ id: "U1072Z101P" }),
                expect.objectContaining({ id: "U1072Z1P" }),
                expect.objectContaining({
                    id: "TLP:leo-1",
                    routes: [
                        expect.objectContaining({
                            id: "LTL:leo-route",
                        }),
                    ],
                }),
            ]),
        });
    });

    it("returns unmatched Leo stops from the database", async () => {
        const service = createService({
            extraStops: [
                {
                    id: "TLS:leo-standalone",
                    name: "Praha hl.n.",
                    avgLatitude: 50.0839,
                    avgLongitude: 14.4359,
                },
            ],
            extraPlatforms: [
                {
                    id: "TLP:leo-standalone",
                    name: "Praha hl.n.",
                    code: null,
                    isMetro: false,
                    latitude: 50.0839,
                    longitude: 14.4359,
                    stopId: "TLS:leo-standalone",
                    routeName: "LE 100",
                },
            ],
            extraPlatformsOnRoutes: [
                {
                    platformId: "TLP:leo-standalone",
                    routeId: "LTL:leo-route",
                    routeName: "LE 100",
                    id: "LTL:leo-route",
                    name: "LE 100",
                },
            ],
        });

        const stops = await service.getAll({
            metroOnly: false,
        });

        expect(stops).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: "TLS:leo-standalone",
                    platforms: [
                        expect.objectContaining({
                            id: "TLP:leo-standalone",
                        }),
                    ],
                }),
            ]),
        );
    });

    it("searches GraphQL stops by name case-insensitively", async () => {
        const service = createService({
            extraStops: [
                {
                    id: "S100",
                    name: "Alpha Station",
                    avgLatitude: 50.1,
                    avgLongitude: 14.4,
                },
                {
                    id: "S200",
                    name: "beta station",
                    avgLatitude: 50.2,
                    avgLongitude: 14.5,
                },
                {
                    id: "S300",
                    name: "Gamma Terminal",
                    avgLatitude: 50.3,
                    avgLongitude: 14.6,
                },
            ],
        });

        const stops = await service.searchGraphQL({
            query: "STATION",
            limit: 1,
            offset: 1,
        });

        expect(stops).toEqual([
            expect.objectContaining({
                id: "S200",
                name: "beta station",
                platforms: [],
                entrances: [],
            }),
        ]);
    });

    it("searches GraphQL stops without requiring diacritics", async () => {
        const service = createService();

        const stops = await service.searchGraphQL({
            query: "VACLAVSKE NAMESTI",
        });

        expect(stops).toEqual([
            expect.objectContaining({
                id: "U1072",
                name: "Václavské náměstí",
            }),
        ]);
    });

    it("searches GraphQL stops by platform name", async () => {
        const service = createService();

        const stops = await service.searchGraphQL({
            query: "mustek",
        });

        expect(stops).toEqual([
            expect.objectContaining({
                id: "U1072",
                name: "Václavské náměstí",
            }),
        ]);
    });

    it("searches GraphQL stops by platform name with diacritics", async () => {
        const service = createService();

        const stops = await service.searchGraphQL({
            query: "můstek",
        });

        expect(stops).toEqual([
            expect.objectContaining({
                id: "U1072",
                name: "Václavské náměstí",
            }),
        ]);
    });

    it("prioritizes metro-connected stops in GraphQL search results", async () => {
        const service = createService({
            extraStops: [
                {
                    id: "BUS100",
                    name: "Trmice,Bělský můstek",
                    avgLatitude: 50.612,
                    avgLongitude: 13.98,
                },
            ],
            extraPlatforms: [
                {
                    id: "BUS100P1",
                    name: "Trmice,Bělský můstek",
                    code: null,
                    isMetro: false,
                    latitude: 50.612,
                    longitude: 13.98,
                    stopId: "BUS100",
                    routeName: "11",
                },
            ],
            extraPlatformsOnRoutes: [
                {
                    platformId: "BUS100P1",
                    routeId: "L11",
                    routeName: "11",
                    id: "L11",
                    name: "11",
                },
            ],
        });

        const stops = await service.searchGraphQL({
            query: "můstek",
        });

        expect(stops.slice(0, 2)).toEqual([
            expect.objectContaining({
                id: "U1072",
                name: "Václavské náměstí",
            }),
            expect.objectContaining({
                id: "BUS100",
                name: "Trmice,Bělský můstek",
            }),
        ]);
    });

    it("searches GraphQL stops with minor typos", async () => {
        const service = createService();

        const stops = await service.searchGraphQL({
            query: "mustke",
        });

        expect(stops).toEqual([
            expect.objectContaining({
                id: "U1072",
                name: "Václavské náměstí",
            }),
        ]);
    });

    it("returns no search results for blank stop-name queries", async () => {
        const service = createService();

        await expect(
            service.searchGraphQL({
                query: "   ",
            }),
        ).resolves.toEqual([]);
    });

    it("returns the latest updatedAt across stops and platforms", async () => {
        const stopTimestamp = new Date("2026-04-10T12:00:00.000Z");
        const platformTimestamp = new Date("2026-04-11T09:30:00.000Z");
        const database = {
            db: {
                selectFrom(tableName: string) {
                    return {
                        select() {
                            return {
                                executeTakeFirstOrThrow: async () => ({
                                    updatedAt:
                                        tableName === "Stop"
                                            ? stopTimestamp
                                            : platformTimestamp,
                                }),
                            };
                        },
                    };
                },
            },
        } as unknown as DatabaseService;
        const cacheManager = {
            wrap: jest.fn(),
        } as unknown as Cache;
        const service = new StopService(database, cacheManager);

        await expect(service.getDataLastUpdatedAt()).resolves.toBe(
            "2026-04-11T09:30:00.000Z",
        );
    });

    it("returns null when neither table has an updatedAt timestamp", async () => {
        const database = {
            db: {
                selectFrom() {
                    return {
                        select() {
                            return {
                                executeTakeFirstOrThrow: async () => ({
                                    updatedAt: null,
                                }),
                            };
                        },
                    };
                },
            },
        } as unknown as DatabaseService;
        const cacheManager = {
            wrap: jest.fn(),
        } as unknown as Cache;
        const service = new StopService(database, cacheManager);

        await expect(service.getDataLastUpdatedAt()).resolves.toBeNull();
    });
});
