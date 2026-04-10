import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`
        CREATE INDEX IF NOT EXISTS "Platform_stopId_idx"
        ON "Platform"("stopId")
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "Platform_isMetro_true_idx"
        ON "Platform"("id") WHERE "isMetro" = true
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "PlatformsOnRoutes_routeId_idx"
        ON "PlatformsOnRoutes"("routeId")
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "GtfsRoute_shortName_idx"
        ON "GtfsRoute"("shortName")
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "GtfsRouteStop_stopId_idx"
        ON "GtfsRouteStop"("stopId")
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "GtfsRouteShape_routeId_isPrimary_idx"
        ON "GtfsRouteShape"("routeId", "isPrimary")
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "RequestLog_appVersion_idx"
        ON "RequestLog"("appVersion")
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "Log_createdAt_idx"
        ON "Log"("createdAt")
    `.execute(db);
}

export async function down(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`DROP INDEX IF EXISTS "Log_createdAt_idx"`.execute(db);
    await sql`DROP INDEX IF EXISTS "RequestLog_appVersion_idx"`.execute(db);
    await sql`DROP INDEX IF EXISTS "GtfsRouteShape_routeId_isPrimary_idx"`.execute(db);
    await sql`DROP INDEX IF EXISTS "GtfsRouteStop_stopId_idx"`.execute(db);
    await sql`DROP INDEX IF EXISTS "GtfsRoute_shortName_idx"`.execute(db);
    await sql`DROP INDEX IF EXISTS "PlatformsOnRoutes_routeId_idx"`.execute(db);
    await sql`DROP INDEX IF EXISTS "Platform_isMetro_true_idx"`.execute(db);
    await sql`DROP INDEX IF EXISTS "Platform_stopId_idx"`.execute(db);
}
