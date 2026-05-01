import type { Kysely } from "kysely";
import { sql } from "kysely";

type TableName =
    | "GtfsRoute"
    | "GtfsRouteStop"
    | "GtfsRouteShape"
    | "GtfsStationEntrance";

type IdentityTableName = "GtfsRouteStop" | "GtfsRouteShape";

type RebuildConfig = {
    createTableStatement: string;
    insertColumns: string;
    orderBy: string;
    overrideSystemValue?: boolean;
    selectColumns: string;
    tableName: TableName;
    tempTableName: string;
};

const TABLES: readonly TableName[] = [
    "GtfsRoute",
    "GtfsRouteStop",
    "GtfsRouteShape",
    "GtfsStationEntrance",
];

const DROP_ORDER: readonly TableName[] = [
    "GtfsRouteStop",
    "GtfsRouteShape",
    "GtfsStationEntrance",
    "GtfsRoute",
];

const RENAME_ORDER: readonly TableName[] = [
    "GtfsRoute",
    "GtfsRouteStop",
    "GtfsRouteShape",
    "GtfsStationEntrance",
];

const IDENTITY_TABLES: readonly IdentityTableName[] = [
    "GtfsRouteStop",
    "GtfsRouteShape",
];

const quote = (value: string): string => `"${value}"`;

const UP_REBUILD_CONFIGS: Record<TableName, RebuildConfig> = {
    GtfsRoute: {
        tableName: "GtfsRoute",
        tempTableName: "GtfsRoute__new",
        createTableStatement: `
            CREATE TABLE "GtfsRoute__new" (
                "id" TEXT NOT NULL,
                "feedId" "GtfsFeedId" NOT NULL,
                "type" TEXT NOT NULL,
                "shortName" TEXT NOT NULL,
                "longName" TEXT,
                "url" TEXT,
                "color" TEXT,
                "isNight" BOOLEAN,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL
            )
        `,
        insertColumns: `
            "id",
            "feedId",
            "type",
            "shortName",
            "longName",
            "url",
            "color",
            "isNight",
            "createdAt",
            "updatedAt"
        `,
        selectColumns: `
            "id",
            "feedId",
            "type",
            "shortName",
            "longName",
            "url",
            "color",
            "isNight",
            "createdAt",
            "updatedAt"
        `,
        orderBy: `"feedId", "id"`,
    },
    GtfsRouteStop: {
        tableName: "GtfsRouteStop",
        tempTableName: "GtfsRouteStop__new",
        createTableStatement: `
            CREATE TABLE "GtfsRouteStop__new" (
                "id" INTEGER GENERATED ALWAYS AS IDENTITY,
                "feedId" "GtfsFeedId" NOT NULL,
                "routeId" TEXT NOT NULL,
                "directionId" TEXT NOT NULL,
                "stopId" TEXT NOT NULL,
                "stopSequence" INTEGER NOT NULL,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL
            )
        `,
        insertColumns: `
            "id",
            "feedId",
            "routeId",
            "directionId",
            "stopId",
            "stopSequence",
            "createdAt",
            "updatedAt"
        `,
        selectColumns: `
            "id",
            "feedId",
            "routeId",
            "directionId",
            "stopId",
            "stopSequence",
            "createdAt",
            "updatedAt"
        `,
        orderBy: `"feedId", "routeId", "directionId", "stopSequence", "stopId", "id"`,
        overrideSystemValue: true,
    },
    GtfsRouteShape: {
        tableName: "GtfsRouteShape",
        tempTableName: "GtfsRouteShape__new",
        createTableStatement: `
            CREATE TABLE "GtfsRouteShape__new" (
                "id" INTEGER GENERATED ALWAYS AS IDENTITY,
                "feedId" "GtfsFeedId" NOT NULL,
                "routeId" TEXT NOT NULL,
                "directionId" TEXT NOT NULL,
                "shapeId" TEXT NOT NULL,
                "tripCount" INTEGER NOT NULL,
                "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
                "geoJson" JSONB NOT NULL,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `,
        insertColumns: `
            "id",
            "feedId",
            "routeId",
            "directionId",
            "shapeId",
            "tripCount",
            "isPrimary",
            "geoJson",
            "createdAt",
            "updatedAt"
        `,
        selectColumns: `
            "id",
            "feedId",
            "routeId",
            "directionId",
            "shapeId",
            "tripCount",
            "isPrimary",
            "geoJson",
            "createdAt",
            "updatedAt"
        `,
        orderBy: `"feedId", "routeId", "directionId", "shapeId", "id"`,
        overrideSystemValue: true,
    },
    GtfsStationEntrance: {
        tableName: "GtfsStationEntrance",
        tempTableName: "GtfsStationEntrance__new",
        createTableStatement: `
            CREATE TABLE "GtfsStationEntrance__new" (
                "id" TEXT NOT NULL,
                "feedId" "GtfsFeedId" NOT NULL,
                "stopId" TEXT NOT NULL,
                "parentStationId" TEXT NOT NULL,
                "name" TEXT NOT NULL,
                "latitude" DOUBLE PRECISION NOT NULL,
                "longitude" DOUBLE PRECISION NOT NULL,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `,
        insertColumns: `
            "id",
            "feedId",
            "stopId",
            "parentStationId",
            "name",
            "latitude",
            "longitude",
            "createdAt",
            "updatedAt"
        `,
        selectColumns: `
            "id",
            "feedId",
            "stopId",
            "parentStationId",
            "name",
            "latitude",
            "longitude",
            "createdAt",
            "updatedAt"
        `,
        orderBy: `"feedId", "id"`,
    },
};

const DOWN_REBUILD_CONFIGS: Record<TableName, RebuildConfig> = {
    GtfsRoute: {
        tableName: "GtfsRoute",
        tempTableName: "GtfsRoute__old",
        createTableStatement: `
            CREATE TABLE "GtfsRoute__old" (
                "id" TEXT NOT NULL,
                "type" TEXT NOT NULL,
                "shortName" TEXT NOT NULL,
                "longName" TEXT,
                "url" TEXT,
                "color" TEXT,
                "isNight" BOOLEAN,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL,
                "feedId" "GtfsFeedId" NOT NULL
            )
        `,
        insertColumns: `
            "id",
            "type",
            "shortName",
            "longName",
            "url",
            "color",
            "isNight",
            "createdAt",
            "updatedAt",
            "feedId"
        `,
        selectColumns: `
            "id",
            "type",
            "shortName",
            "longName",
            "url",
            "color",
            "isNight",
            "createdAt",
            "updatedAt",
            "feedId"
        `,
        orderBy: `"feedId", "id"`,
    },
    GtfsRouteStop: {
        tableName: "GtfsRouteStop",
        tempTableName: "GtfsRouteStop__old",
        createTableStatement: `
            CREATE TABLE "GtfsRouteStop__old" (
                "routeId" TEXT NOT NULL,
                "directionId" TEXT NOT NULL,
                "stopId" TEXT NOT NULL,
                "stopSequence" INTEGER NOT NULL,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL,
                "feedId" "GtfsFeedId" NOT NULL,
                "id" INTEGER GENERATED ALWAYS AS IDENTITY
            )
        `,
        insertColumns: `
            "routeId",
            "directionId",
            "stopId",
            "stopSequence",
            "createdAt",
            "updatedAt",
            "feedId",
            "id"
        `,
        selectColumns: `
            "routeId",
            "directionId",
            "stopId",
            "stopSequence",
            "createdAt",
            "updatedAt",
            "feedId",
            "id"
        `,
        orderBy: `"feedId", "routeId", "directionId", "stopSequence", "stopId", "id"`,
        overrideSystemValue: true,
    },
    GtfsRouteShape: {
        tableName: "GtfsRouteShape",
        tempTableName: "GtfsRouteShape__old",
        createTableStatement: `
            CREATE TABLE "GtfsRouteShape__old" (
                "routeId" TEXT NOT NULL,
                "directionId" TEXT NOT NULL,
                "shapeId" TEXT NOT NULL,
                "tripCount" INTEGER NOT NULL,
                "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
                "geoJson" JSONB NOT NULL,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "feedId" "GtfsFeedId" NOT NULL,
                "id" INTEGER GENERATED ALWAYS AS IDENTITY
            )
        `,
        insertColumns: `
            "routeId",
            "directionId",
            "shapeId",
            "tripCount",
            "isPrimary",
            "geoJson",
            "createdAt",
            "updatedAt",
            "feedId",
            "id"
        `,
        selectColumns: `
            "routeId",
            "directionId",
            "shapeId",
            "tripCount",
            "isPrimary",
            "geoJson",
            "createdAt",
            "updatedAt",
            "feedId",
            "id"
        `,
        orderBy: `"feedId", "routeId", "directionId", "shapeId", "id"`,
        overrideSystemValue: true,
    },
    GtfsStationEntrance: {
        tableName: "GtfsStationEntrance",
        tempTableName: "GtfsStationEntrance__old",
        createTableStatement: `
            CREATE TABLE "GtfsStationEntrance__old" (
                "id" TEXT NOT NULL,
                "stopId" TEXT NOT NULL,
                "parentStationId" TEXT NOT NULL,
                "name" TEXT NOT NULL,
                "latitude" DOUBLE PRECISION NOT NULL,
                "longitude" DOUBLE PRECISION NOT NULL,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "feedId" "GtfsFeedId" NOT NULL
            )
        `,
        insertColumns: `
            "id",
            "stopId",
            "parentStationId",
            "name",
            "latitude",
            "longitude",
            "createdAt",
            "updatedAt",
            "feedId"
        `,
        selectColumns: `
            "id",
            "stopId",
            "parentStationId",
            "name",
            "latitude",
            "longitude",
            "createdAt",
            "updatedAt",
            "feedId"
        `,
        orderBy: `"feedId", "id"`,
    },
};

const POST_RENAME_STATEMENTS = [
    `ALTER TABLE "GtfsRoute" ADD CONSTRAINT "GtfsRoute_pkey" PRIMARY KEY ("feedId", "id")`,
    `CREATE INDEX "GtfsRoute_feedId_idx" ON "GtfsRoute"("feedId")`,
    `CREATE INDEX "GtfsRoute_shortName_idx" ON "GtfsRoute"("shortName")`,
    `ALTER TABLE "GtfsRouteStop" ADD CONSTRAINT "GtfsRouteStop_pkey" PRIMARY KEY ("id")`,
    `CREATE UNIQUE INDEX "GtfsRouteStop_feed_route_direction_stop_sequence_key" ON "GtfsRouteStop"("feedId", "routeId", "directionId", "stopId", "stopSequence")`,
    `CREATE INDEX "GtfsRouteStop_feedId_idx" ON "GtfsRouteStop"("feedId")`,
    `CREATE INDEX "GtfsRouteStop_stopId_idx" ON "GtfsRouteStop"("stopId")`,
    `ALTER TABLE "GtfsRouteShape" ADD CONSTRAINT "GtfsRouteShape_pkey" PRIMARY KEY ("id")`,
    `ALTER TABLE "GtfsRouteShape" ADD CONSTRAINT "GtfsRouteShape_routeId_directionId_shapeId_unique" UNIQUE ("feedId", "routeId", "directionId", "shapeId")`,
    `CREATE INDEX "GtfsRouteShape_feedId_idx" ON "GtfsRouteShape"("feedId")`,
    `CREATE INDEX "GtfsRouteShape_routeId_idx" ON "GtfsRouteShape"("routeId")`,
    `CREATE INDEX "GtfsRouteShape_routeId_isPrimary_idx" ON "GtfsRouteShape"("routeId", "isPrimary")`,
    `CREATE INDEX "GtfsRouteShape_shapeId_idx" ON "GtfsRouteShape"("shapeId")`,
    `ALTER TABLE "GtfsStationEntrance" ADD CONSTRAINT "GtfsStationEntrance_pkey" PRIMARY KEY ("feedId", "id")`,
    `CREATE INDEX "GtfsStationEntrance_feedId_idx" ON "GtfsStationEntrance"("feedId")`,
    `CREATE INDEX "GtfsStationEntrance_parentStationId_idx" ON "GtfsStationEntrance"("parentStationId")`,
    `CREATE INDEX "GtfsStationEntrance_stopId_idx" ON "GtfsStationEntrance"("stopId")`,
    `ALTER TABLE "GtfsRouteStop" ADD CONSTRAINT "GtfsRouteStop_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "GtfsRouteStop" ADD CONSTRAINT "GtfsRouteStop_feed_route_fkey" FOREIGN KEY ("feedId", "routeId") REFERENCES "GtfsRoute"("feedId", "id") ON DELETE CASCADE ON UPDATE CASCADE`,
    `ALTER TABLE "GtfsRouteShape" ADD CONSTRAINT "GtfsRouteShape_feed_route_fkey" FOREIGN KEY ("feedId", "routeId") REFERENCES "GtfsRoute"("feedId", "id") ON DELETE CASCADE ON UPDATE CASCADE`,
    `ALTER TABLE "GtfsStationEntrance" ADD CONSTRAINT "GtfsStationEntrance_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
] as const;

const createAndCopyTable = async (
    db: Kysely<unknown>,
    {
        createTableStatement,
        insertColumns,
        orderBy,
        overrideSystemValue = false,
        selectColumns,
        tableName,
        tempTableName,
    }: RebuildConfig,
): Promise<void> => {
    await sql.raw(createTableStatement).execute(db);

    await sql
        .raw(`
            INSERT INTO ${quote(tempTableName)} (
                ${insertColumns}
            )${overrideSystemValue ? " OVERRIDING SYSTEM VALUE" : ""}
            SELECT
                ${selectColumns}
            FROM ${quote(tableName)}
            ORDER BY ${orderBy}
        `)
        .execute(db);
};

const renameTables = async (
    db: Kysely<unknown>,
    configs: Record<TableName, RebuildConfig>,
): Promise<void> => {
    for (const tableName of RENAME_ORDER) {
        await sql
            .raw(
                `ALTER TABLE ${quote(configs[tableName].tempTableName)} RENAME TO ${quote(tableName)}`,
            )
            .execute(db);
    }
};

const restartIdentitySequence = async (
    db: Kysely<unknown>,
    tableName: IdentityTableName,
): Promise<void> => {
    await sql
        .raw(`
            DO $$
            DECLARE
                next_id INTEGER;
            BEGIN
                SELECT COALESCE(MAX("id") + 1, 1)
                INTO next_id
                FROM ${quote(tableName)};

                EXECUTE format(
                    'ALTER TABLE ${quote(tableName)} ALTER COLUMN "id" RESTART WITH %s',
                    next_id
                );
            END $$;
        `)
        .execute(db);
};

const rebuildTables = async (
    db: Kysely<unknown>,
    configs: Record<TableName, RebuildConfig>,
): Promise<void> => {
    for (const tableName of TABLES) {
        await createAndCopyTable(db, configs[tableName]);
    }

    for (const tableName of DROP_ORDER) {
        await sql.raw(`DROP TABLE ${quote(tableName)}`).execute(db);
    }

    await renameTables(db, configs);

    for (const statement of POST_RENAME_STATEMENTS) {
        await sql.raw(statement).execute(db);
    }

    for (const tableName of IDENTITY_TABLES) {
        await restartIdentitySequence(db, tableName);
    }
};

export async function up(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await rebuildTables(db, UP_REBUILD_CONFIGS);
}

export async function down(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await rebuildTables(db, DOWN_REBUILD_CONFIGS);
}
