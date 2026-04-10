import type { Kysely } from "kysely";
import { sql } from "kysely";

type NumericIdTableConfig = {
    columnsDefinition: string;
    insertColumns: string;
    selectColumns: string;
    orderBy: string;
    sequenceName: "Log_id_seq" | "RequestLog_id_seq";
    primaryKeyName: "Log_pkey" | "RequestLog_pkey";
    indexes: readonly string[];
};

type TableName = "Log" | "RequestLog";

const NUMERIC_ID_TABLES: Record<TableName, NumericIdTableConfig> = {
    Log: {
        columnsDefinition: `
            "service" TEXT NOT NULL,
            "level" "LogLevel" NOT NULL,
            "message" TEXT NOT NULL,
            "context" JSONB,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        `,
        insertColumns: `"service", "level", "message", "context", "createdAt"`,
        selectColumns: `"service", "level", "message", "context", "createdAt"`,
        orderBy: `"createdAt", "id"`,
        sequenceName: "Log_id_seq",
        primaryKeyName: "Log_pkey",
        indexes: [
            `CREATE INDEX "Log_service_createdAt_idx" ON "Log"("service", "createdAt")`,
            `CREATE INDEX "Log_level_createdAt_idx" ON "Log"("level", "createdAt")`,
        ],
    },
    RequestLog: {
        columnsDefinition: `
            "method" TEXT NOT NULL,
            "path" TEXT NOT NULL,
            "statusCode" INTEGER NOT NULL,
            "durationMs" INTEGER NOT NULL,
            "cached" BOOLEAN NOT NULL DEFAULT FALSE,
            "userAgent" TEXT,
            "appVersion" TEXT,
            "headers" JSONB,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        `,
        insertColumns: `"method", "path", "statusCode", "durationMs", "cached", "userAgent", "appVersion", "headers", "createdAt"`,
        selectColumns: `"method", "path", "statusCode", "durationMs", "cached", "userAgent", "appVersion", "headers", "createdAt"`,
        orderBy: `"createdAt", "id"`,
        sequenceName: "RequestLog_id_seq",
        primaryKeyName: "RequestLog_pkey",
        indexes: [
            `CREATE INDEX "RequestLog_path_createdAt_idx" ON "RequestLog"("path", "createdAt")`,
            `CREATE INDEX "RequestLog_createdAt_idx" ON "RequestLog"("createdAt")`,
        ],
    },
};

const quote = (value: string): string => `"${value}"`;

const migrateTextPrimaryKeyToInteger = async (
    db: Kysely<unknown>,
    tableName: TableName,
): Promise<void> => {
    const {
        columnsDefinition,
        insertColumns,
        selectColumns,
        orderBy,
        sequenceName,
        primaryKeyName,
        indexes,
    } = NUMERIC_ID_TABLES[tableName];
    const tempTableName = `${tableName}__new`;

    await sql
        .raw(`CREATE SEQUENCE IF NOT EXISTS ${quote(sequenceName)}`)
        .execute(db);

    await sql
        .raw(`
        CREATE TABLE ${quote(tempTableName)} (
            "id" INTEGER NOT NULL DEFAULT nextval('${quote(sequenceName)}'),
            ${columnsDefinition}
        )
    `)
        .execute(db);

    await sql
        .raw(`
        INSERT INTO ${quote(tempTableName)} ("id", ${insertColumns})
        SELECT
            ROW_NUMBER() OVER (ORDER BY ${orderBy}) AS "id",
            ${selectColumns}
        FROM ${quote(tableName)}
    `)
        .execute(db);

    await sql
        .raw(`
        SELECT setval(
            '${quote(sequenceName)}',
            COALESCE((SELECT MAX("id") FROM ${quote(tempTableName)}), 1),
            EXISTS(SELECT 1 FROM ${quote(tempTableName)})
        )
    `)
        .execute(db);

    await sql
        .raw(
            `ALTER SEQUENCE ${quote(sequenceName)} OWNED BY ${quote(tempTableName)}."id"`,
        )
        .execute(db);

    await sql.raw(`DROP TABLE ${quote(tableName)}`).execute(db);
    await sql
        .raw(
            `ALTER TABLE ${quote(tempTableName)} RENAME TO ${quote(tableName)}`,
        )
        .execute(db);
    await sql
        .raw(
            `ALTER TABLE ${quote(tableName)} ADD CONSTRAINT ${quote(primaryKeyName)} PRIMARY KEY ("id")`,
        )
        .execute(db);

    for (const indexStatement of indexes) {
        await sql.raw(indexStatement).execute(db);
    }
};

const migrateIntegerPrimaryKeyToText = async (
    db: Kysely<unknown>,
    tableName: TableName,
): Promise<void> => {
    const {
        columnsDefinition,
        insertColumns,
        selectColumns,
        primaryKeyName,
        sequenceName,
        indexes,
    } = NUMERIC_ID_TABLES[tableName];
    const tempTableName = `${tableName}__old`;

    await sql
        .raw(`
        CREATE TABLE ${quote(tempTableName)} (
            "id" TEXT NOT NULL,
            ${columnsDefinition}
        )
    `)
        .execute(db);

    await sql
        .raw(`
        INSERT INTO ${quote(tempTableName)} ("id", ${insertColumns})
        SELECT
            "id"::TEXT AS "id",
            ${selectColumns}
        FROM ${quote(tableName)}
        ORDER BY "id"
    `)
        .execute(db);

    await sql.raw(`DROP TABLE ${quote(tableName)}`).execute(db);
    await sql
        .raw(
            `ALTER TABLE ${quote(tempTableName)} RENAME TO ${quote(tableName)}`,
        )
        .execute(db);
    await sql
        .raw(
            `ALTER TABLE ${quote(tableName)} ADD CONSTRAINT ${quote(primaryKeyName)} PRIMARY KEY ("id")`,
        )
        .execute(db);

    for (const indexStatement of indexes) {
        await sql.raw(indexStatement).execute(db);
    }

    await sql.raw(`DROP SEQUENCE IF EXISTS ${quote(sequenceName)}`).execute(db);
};

export async function up(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await migrateTextPrimaryKeyToInteger(db, "Log");
    await migrateTextPrimaryKeyToInteger(db, "RequestLog");
}

export async function down(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await migrateIntegerPrimaryKeyToText(db, "RequestLog");
    await migrateIntegerPrimaryKeyToText(db, "Log");
}
