import { type PrismaClient } from "@metro-now/database";
import { createPrismaClient } from "@metro-now/shared";

export class DatabaseService {
    readonly prisma: PrismaClient;

    constructor(
        prisma: PrismaClient = createPrismaClient({
            log: ["info", "warn", "error"],
        }),
    ) {
        this.prisma = prisma;
    }

    async getDatabaseStats(): Promise<{
        stops: number;
        platforms: number;
        routes: number;
        platformRoutes: number;
        gtfsRoutes: number;
        gtfsRouteStops: number;
    }> {
        const [
            stops,
            platforms,
            routes,
            platformRoutes,
            gtfsRoutes,
            gtfsRouteStops,
        ] = await Promise.all([
            this.prisma.stop.count(),
            this.prisma.platform.count(),
            this.prisma.route.count(),
            this.prisma.platformsOnRoutes.count(),
            this.prisma.gtfsRoute.count(),
            this.prisma.gtfsRouteStop.count(),
        ]);

        return {
            stops,
            platforms,
            routes,
            platformRoutes,
            gtfsRoutes,
            gtfsRouteStops,
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
    }> {
        const [stops, platforms, gtfsRoutes] = await Promise.all([
            this.prisma.stop.findMany({
                select: {
                    id: true,
                    name: true,
                },
                orderBy: {
                    id: "asc",
                },
                take: 5,
            }),
            this.prisma.platform.findMany({
                select: {
                    id: true,
                    name: true,
                    stopId: true,
                },
                orderBy: {
                    id: "asc",
                },
                take: 5,
            }),
            this.prisma.gtfsRoute.findMany({
                select: {
                    id: true,
                    shortName: true,
                },
                orderBy: {
                    id: "asc",
                },
                take: 5,
            }),
        ]);

        return {
            stops,
            platforms,
            gtfsRoutes,
        };
    }

    async performHealthCheck(): Promise<{
        extensions: string[];
    }> {
        await this.prisma.$queryRaw`SELECT 1`;

        const extensions = await this.prisma.$queryRaw<Array<{ extname: string }>>`
            SELECT extname FROM pg_extension ORDER BY extname
        `;

        return {
            extensions: extensions.map(({ extname }) => extname),
        };
    }

    async disconnect(): Promise<void> {
        await this.prisma.$disconnect();
    }
}
