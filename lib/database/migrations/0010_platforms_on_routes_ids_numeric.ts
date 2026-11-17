import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`
        CREATE TABLE "PlatformsOnRoutes__new" (
            "id" INTEGER GENERATED ALWAYS AS IDENTITY,
            "platformId" TEXT NOT NULL,
            "routeId" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL
        )
    `.execute(db);

    await sql`
        INSERT INTO "PlatformsOnRoutes__new" (
            "platformId",
            "routeId",
            "createdAt",
            "updatedAt"
        )
        SELECT
            "platformId",
            "routeId",
            "createdAt",
            "updatedAt"
        FROM "PlatformsOnRoutes"
        ORDER BY "platformId", "routeId", "id"
    `.execute(db);

    await sql`DROP TABLE "PlatformsOnRoutes"`.execute(db);
    await sql`
        ALTER TABLE "PlatformsOnRoutes__new"
        RENAME TO "PlatformsOnRoutes"
    `.execute(db);

    await sql`
        ALTER TABLE "PlatformsOnRoutes"
        ADD CONSTRAINT "PlatformsOnRoutes_pkey" PRIMARY KEY ("id")
    `.execute(db);
    await sql`
        ALTER TABLE "PlatformsOnRoutes"
        ADD CONSTRAINT "PlatformsOnRoutes_platformId_fkey"
        FOREIGN KEY ("platformId")
        REFERENCES "Platform"("id")
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    `.execute(db);
    await sql`
        ALTER TABLE "PlatformsOnRoutes"
        ADD CONSTRAINT "PlatformsOnRoutes_routeId_fkey"
        FOREIGN KEY ("routeId")
        REFERENCES "Route"("id")
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    `.execute(db);

    await sql`
        CREATE UNIQUE INDEX "PlatformsOnRoutes_platformId_routeId_key"
        ON "PlatformsOnRoutes"("platformId", "routeId")
    `.execute(db);
    await sql`
        CREATE INDEX "PlatformsOnRoutes_routeId_idx"
        ON "PlatformsOnRoutes"("routeId")
    `.execute(db);
}

export async function down(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`
        CREATE TABLE "PlatformsOnRoutes__old" (
            "id" TEXT NOT NULL,
            "platformId" TEXT NOT NULL,
            "routeId" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL
        )
    `.execute(db);

    await sql`
        INSERT INTO "PlatformsOnRoutes__old" (
            "id",
            "platformId",
            "routeId",
            "createdAt",
            "updatedAt"
        )
        SELECT
            "id"::TEXT,
            "platformId",
            "routeId",
            "createdAt",
            "updatedAt"
        FROM "PlatformsOnRoutes"
        ORDER BY "id"
    `.execute(db);

    await sql`DROP TABLE "PlatformsOnRoutes"`.execute(db);
    await sql`
        ALTER TABLE "PlatformsOnRoutes__old"
        RENAME TO "PlatformsOnRoutes"
    `.execute(db);

    await sql`
        ALTER TABLE "PlatformsOnRoutes"
        ADD CONSTRAINT "PlatformsOnRoutes_pkey" PRIMARY KEY ("id")
    `.execute(db);
    await sql`
        ALTER TABLE "PlatformsOnRoutes"
        ADD CONSTRAINT "PlatformsOnRoutes_platformId_fkey"
        FOREIGN KEY ("platformId")
        REFERENCES "Platform"("id")
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    `.execute(db);
    await sql`
        ALTER TABLE "PlatformsOnRoutes"
        ADD CONSTRAINT "PlatformsOnRoutes_routeId_fkey"
        FOREIGN KEY ("routeId")
        REFERENCES "Route"("id")
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    `.execute(db);

    await sql`
        CREATE UNIQUE INDEX "PlatformsOnRoutes_platformId_routeId_key"
        ON "PlatformsOnRoutes"("platformId", "routeId")
    `.execute(db);
    await sql`
        CREATE INDEX "PlatformsOnRoutes_routeId_idx"
        ON "PlatformsOnRoutes"("routeId")
    `.execute(db);
}
