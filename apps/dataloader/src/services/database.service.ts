import { type DatabaseClient, sql } from "@metro-now/database";
import { createDatabaseClient } from "@metro-now/shared";

export class DatabaseService {
    readonly db: DatabaseClient;

    constructor(
        db: DatabaseClient = createDatabaseClient({ env: process.env }),
    ) {
        this.db = db;
    }

    async getDatabaseStats(): Promise<{
        stops: number;
        platforms: number;
        routes: number;
        platformRoutes: number;
        gtfsRoutes: number;
        gtfsRouteStops: number;
        gtfsRouteShapes: number;
    }> {
        const [
            stopsResult,
            platformsResult,
            routesResult,
            platformRoutesResult,
            gtfsRoutesResult,
            gtfsRouteStopsResult,
            gtfsRouteShapesResult,
        ] = await Promise.all([
            this.db
                .selectFrom("Stop")
                .select(({ fn }) => fn.countAll<number>().as("count"))
                .executeTakeFirstOrThrow(),
            this.db
                .selectFrom("Platform")
                .select(({ fn }) => fn.countAll<number>().as("count"))
                .executeTakeFirstOrThrow(),
            this.db
                .selectFrom("Route")
                .select(({ fn }) => fn.countAll<number>().as("count"))
                .executeTakeFirstOrThrow(),
            this.db
                .selectFrom("PlatformsOnRoutes")
                .select(({ fn }) => fn.countAll<number>().as("count"))
                .executeTakeFirstOrThrow(),
            this.db
                .selectFrom("GtfsRoute")
                .select(({ fn }) => fn.countAll<number>().as("count"))
                .executeTakeFirstOrThrow(),
            this.db
                .selectFrom("GtfsRouteStop")
                .select(({ fn }) => fn.countAll<number>().as("count"))
                .executeTakeFirstOrThrow(),
            this.db
                .selectFrom("GtfsRouteShape")
                .select(({ fn }) => fn.countAll<number>().as("count"))
                .executeTakeFirstOrThrow(),
        ]);

        return {
            stops: Number(stopsResult.count),
            platforms: Number(platformsResult.count),
            routes: Number(routesResult.count),
            platformRoutes: Number(platformRoutesResult.count),
            gtfsRoutes: Number(gtfsRoutesResult.count),
            gtfsRouteStops: Number(gtfsRouteStopsResult.count),
            gtfsRouteShapes: Number(gtfsRouteShapesResult.count),
        };
    }

    async getDataPreview(): Promise<{
        stops: Array<{
            id: string;
            name: string;
        }>;
        platforms: Array<{
            id: string;
            name: string;
            stopId: string | null;
        }>;
        gtfsRoutes: Array<{
            id: string;
            shortName: string;
        }>;
        gtfsRouteShapes: Array<{
            routeId: string;
            directionId: string;
            shapeId: string;
            tripCount: number;
            isPrimary: boolean;
        }>;
    }> {
        const [stops, platforms, gtfsRoutes, gtfsRouteShapes] =
            await Promise.all([
                this.db
                    .selectFrom("Stop")
                    .select(["id", "name"])
                    .orderBy("id", "asc")
                    .limit(5)
                    .execute(),
                this.db
                    .selectFrom("Platform")
                    .select(["id", "name", "stopId"])
                    .orderBy("id", "asc")
                    .limit(5)
                    .execute(),
                this.db
                    .selectFrom("GtfsRoute")
                    .select(["id", "shortName"])
                    .orderBy("id", "asc")
                    .limit(5)
                    .execute(),
                this.db
                    .selectFrom("GtfsRouteShape")
                    .select([
                        "routeId",
                        "directionId",
                        "shapeId",
                        "tripCount",
                        "isPrimary",
                    ])
                    .orderBy("routeId", "asc")
                    .orderBy("directionId", "asc")
                    .orderBy("shapeId", "asc")
                    .limit(5)
                    .execute(),
            ]);

        return {
            stops,
            platforms,
            gtfsRoutes,
            gtfsRouteShapes,
        };
    }

    async performHealthCheck(): Promise<{
        extensions: string[];
    }> {
        await sql`SELECT 1`.execute(this.db);

        const extensions = await sql<{ extname: string }>`
            SELECT extname
            FROM pg_extension
            ORDER BY extname
        `.execute(this.db);

        return {
            extensions: extensions.rows.map(({ extname }) => extname),
        };
    }

    async disconnect(): Promise<void> {
        await this.db.destroy();
    }
}
