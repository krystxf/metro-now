import { promises as fs } from "node:fs";
import * as path from "node:path";

import {
    FileMigrationProvider,
    Kysely,
    Migrator,
    PostgresDialect,
} from "kysely";
import { Pool } from "pg";
import type { MetroNowDatabase } from "./index";

const unwrapEnvValue = (value: string): string => {
    const trimmed = value.trim();

    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1);
    }

    return trimmed;
};

const expandEnvVariables = (value: string, env: NodeJS.ProcessEnv): string => {
    return value.replace(
        /\$\{([A-Z0-9_]+)\}/g,
        (_match, key: string) => env[key] ?? "",
    );
};

const resolveConnectionString = (
    env: NodeJS.ProcessEnv = process.env,
): string => {
    if (env.DATABASE_URL) {
        const expanded = expandEnvVariables(
            unwrapEnvValue(env.DATABASE_URL),
            env,
        );

        try {
            return new URL(expanded).toString();
        } catch {
            // fall through to assembling from parts
        }
    }

    const required = [
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "POSTGRES_DB",
        "DB_HOST",
        "DB_PORT",
        "DB_SCHEMA",
    ] as const;
    const missing = required.filter((key) => !env[key]);

    if (missing.length > 0) {
        throw new Error(
            `Missing database environment variables: ${missing.join(", ")}`,
        );
    }

    return `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.POSTGRES_DB}?schema=${env.DB_SCHEMA}`;
};

const createDb = (): Kysely<MetroNowDatabase> => {
    const connectionString = resolveConnectionString();

    return new Kysely<MetroNowDatabase>({
        dialect: new PostgresDialect({
            pool: new Pool({ connectionString }),
        }),
    });
};

const runMigrations = async (direction: "up" | "down"): Promise<void> => {
    const db = createDb();

    const migrator = new Migrator({
        db,
        provider: new FileMigrationProvider({
            fs,
            path,
            migrationFolder: path.join(__dirname, "migrations"),
        }),
        // Kysely wraps all pending migrations in one transaction by default.
        // That prevents enum values added via ALTER TYPE ADD VALUE from being
        // used in later migrations within the same run (Postgres error 55P04).
        disableTransactions: true,
    });

    const { error, results } =
        direction === "up"
            ? await migrator.migrateToLatest()
            : await migrator.migrateDown();

    for (const result of results ?? []) {
        if (result.status === "Success") {
            console.log(
                `Migration "${result.migrationName}" ${direction === "up" ? "applied" : "reverted"} successfully`,
            );
        } else if (result.status === "Error") {
            console.error(
                `Failed to ${direction === "up" ? "apply" : "revert"} migration "${result.migrationName}"`,
            );
        }
    }

    if (error) {
        console.error("Migration failed:", error);
        await db.destroy();
        process.exit(1);
    }

    if (!results?.length) {
        console.log("No migrations to run");
    }

    await db.destroy();
};

const command = process.argv[2];

switch (command) {
    case "up":
    case "deploy":
    case "latest":
        runMigrations("up").catch((e) => {
            console.error(e);
            process.exit(1);
        });
        break;
    case "down":
    case "rollback":
        runMigrations("down").catch((e) => {
            console.error(e);
            process.exit(1);
        });
        break;
    default:
        console.log("Usage: ts-node migrate.ts <up|down>");
        console.log("  up / deploy / latest  - Apply all pending migrations");
        console.log("  down / rollback       - Revert the last migration");
        process.exit(1);
}
