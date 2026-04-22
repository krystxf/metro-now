import * as fs from "node:fs";

import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { MetroNowDatabase } from "./index";
import {
    type SeedPlatform,
    type SeedStop,
    mapSeedPlatform,
    mapSeedStop,
} from "./seed-mapping";

const BATCH_SIZE = 500;

const parseSeedFile = <T>(path: string): T => {
    const raw = fs.readFileSync(path).toString();

    return JSON.parse(raw);
};

async function insertInBatches<T>(
    transaction: Kysely<MetroNowDatabase>,
    table: "Stop" | "Platform",
    values: T[],
): Promise<void> {
    for (let i = 0; i < values.length; i += BATCH_SIZE) {
        // biome-ignore lint/suspicious/noExplicitAny: Kysely insertInto returns different types per table, generic batch helper needs type erasure
        await (transaction.insertInto(table) as any)
            .values(values.slice(i, i + BATCH_SIZE))
            .execute();
    }
}

async function main() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error("DATABASE_URL environment variable is required");
    }

    const db = new Kysely<MetroNowDatabase>({
        dialect: new PostgresDialect({
            pool: new Pool({ connectionString }),
        }),
    });

    const stops = parseSeedFile<SeedStop[]>("./seeds/stops.json");
    const platforms = parseSeedFile<SeedPlatform[]>("./seeds/platforms.json");

    await db.transaction().execute(async (transaction) => {
        await transaction.deleteFrom("PlatformsOnRoutes").execute();
        await transaction.deleteFrom("Platform").execute();
        await transaction.deleteFrom("Stop").execute();

        const timestamp = new Date();

        await insertInBatches(
            transaction,
            "Stop",
            stops.map((stop) => mapSeedStop(stop, timestamp)),
        );

        await insertInBatches(
            transaction,
            "Platform",
            platforms.map((platform) => mapSeedPlatform(platform, timestamp)),
        );
    });

    await db.destroy();
}

main()
    .then(() => {
        console.log("Seed completed successfully");
    })
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
