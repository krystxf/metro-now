import express, { type Request, type Response } from "express";

import { getDataloaderEnv, loadEnvironment } from "./config/env";
import { CacheInvalidationService } from "./services/core/cache-invalidation.service";
import { CronService } from "./services/core/cron.service";
import { DatabaseLogStore } from "./services/core/database-log-store.service";
import { DatabaseService } from "./services/core/database.service";
import { SyncService } from "./services/sync/sync.service";
import { logger } from "./utils/logger";

loadEnvironment();

const env = getDataloaderEnv();
const app = express();
const databaseService = new DatabaseService();
logger.setTransport(new DatabaseLogStore(databaseService.db));

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = Number.parseInt(process.env.REDIS_PORT || "6379");
const cacheInvalidation = new CacheInvalidationService(redisHost, redisPort);

const syncService = new SyncService(databaseService.db, {
    entityBatchSize: env.entityBatchSize,
    relationBatchSize: env.relationBatchSize,
    cacheInvalidation,
});
const cronService = new CronService();

app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
    res.send("Metro Now dataloader");
});

app.get("/health", async (_req: Request, res: Response) => {
    try {
        const health = await databaseService.performHealthCheck();

        res.json({
            status: "ok",
            service: "dataloader",
            timestamp: new Date().toISOString(),
            database: "connected",
            extensions: health.extensions,
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            service: "dataloader",
            message: error instanceof Error ? error.message : String(error),
        });
    }
});

app.get("/status", (_req: Request, res: Response) => {
    res.json({
        service: "dataloader",
        environment: process.env.NODE_ENV ?? "development",
        port: env.port,
        uptimeSeconds: process.uptime(),
        sync: syncService.getStatus(),
        cron: cronService.getJobStatus(),
        timestamp: new Date().toISOString(),
    });
});

app.get("/api/database/stats", async (_req: Request, res: Response) => {
    try {
        const [stats, preview] = await Promise.all([
            databaseService.getDatabaseStats(),
            databaseService.getDataPreview(),
        ]);

        res.json({
            success: true,
            stats,
            preview,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
});

app.post("/api/sync/run", async (_req: Request, res: Response) => {
    try {
        const result = await syncService.syncEverything("manual");

        res.json({
            success: true,
            result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
});

app.get("/api/sync/status", (_req: Request, res: Response) => {
    res.json({
        success: true,
        sync: syncService.getStatus(),
        cron: cronService.getJobStatus(),
    });
});

app.post("/api/cron/start/:jobName", (req: Request, res: Response) => {
    const success = cronService.startJob(req.params.jobName);

    res.status(success ? 200 : 404).json({
        success,
    });
});

app.post("/api/cron/stop/:jobName", (req: Request, res: Response) => {
    const success = cronService.stopJob(req.params.jobName);

    res.status(success ? 200 : 404).json({
        success,
    });
});

const bootstrap = async (): Promise<void> => {
    try {
        await cacheInvalidation.connect();
        logger.info("Connected to Redis for cache invalidation", {
            host: redisHost,
            port: redisPort,
        });
    } catch (error) {
        logger.warn(
            "Failed to connect to Redis for cache invalidation, continuing without it",
            {
                error: error instanceof Error ? error.message : String(error),
            },
        );
    }

    cronService.addJob(
        {
            name: "pid-sync",
            description: "Syncs PID stops and GTFS snapshots into Postgres",
            enabled: true,
            schedule: env.syncSchedule,
        },
        async () => {
            await syncService.syncEverything("cron");
        },
    );

    await syncService.syncEverything("startup");
    cronService.startAll();

    app.listen(env.port, () => {
        logger.info("Dataloader listening", {
            port: env.port,
            syncSchedule: env.syncSchedule,
            entityBatchSize: env.entityBatchSize,
            relationBatchSize: env.relationBatchSize,
        });
    });
};

const shutdown = async (signal: string): Promise<void> => {
    logger.info("Received shutdown signal", { signal });
    cronService.shutdown();
    await cacheInvalidation.disconnect();
    await logger.flush();
    await databaseService.disconnect();
    process.exit(0);
};

void bootstrap().catch(async (error) => {
    logger.error("Failed to start dataloader", {
        error: error instanceof Error ? error.message : String(error),
    });
    await logger.flush();
    await databaseService.disconnect();
    process.exit(1);
});

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});
