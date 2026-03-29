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

const createDb = (): Kysely<MetroNowDatabase> => {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error("DATABASE_URL environment variable is required");
    }

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
