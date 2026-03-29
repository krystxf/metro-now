import cron, { type ScheduledTask } from "node-cron";

import { logger } from "../utils/logger";

export type CronJobState = {
    description: string;
    enabled: boolean;
    running: boolean;
    schedule: string;
    lastStartedAt: string | null;
    lastFinishedAt: string | null;
    lastError: string | null;
};

type CronJobConfig = {
    name: string;
    description: string;
    enabled: boolean;
    schedule: string;
};

type ManagedCronJob = {
    config: CronJobConfig;
    lastError: string | null;
    lastFinishedAt: Date | null;
    lastStartedAt: Date | null;
    running: boolean;
    task: ScheduledTask;
};

export class CronService {
    private readonly jobs = new Map<string, ManagedCronJob>();

    addJob(config: CronJobConfig, task: () => Promise<void>): void {
        if (this.jobs.has(config.name)) {
            this.removeJob(config.name);
        }

        if (!config.enabled) {
            logger.info("Skipping disabled cron job", { name: config.name });
            return;
        }

        if (!cron.validate(config.schedule)) {
            throw new Error(`Invalid cron schedule: ${config.schedule}`);
        }

        const managedJob: ManagedCronJob = {
            config,
            lastError: null,
            lastFinishedAt: null,
            lastStartedAt: null,
            running: false,
            task: cron.createTask(
                config.schedule,
                async () => {
                    managedJob.running = true;
                    managedJob.lastStartedAt = new Date();
                    managedJob.lastError = null;

                    try {
                        logger.info("Running cron job", {
                            name: config.name,
                            schedule: config.schedule,
                        });
                        await task();
                    } catch (error) {
                        managedJob.lastError =
                            error instanceof Error
                                ? error.message
                                : String(error);
                        logger.error("Cron job failed", {
                            name: config.name,
                            error: managedJob.lastError,
                        });
                    } finally {
                        managedJob.running = false;
                        managedJob.lastFinishedAt = new Date();
                    }
                },
                {
                    name: config.name,
                    noOverlap: true,
                    timezone: "Europe/Prague",
                },
            ),
        };

        this.jobs.set(config.name, managedJob);
    }

    startJob(name: string): boolean {
        const job = this.jobs.get(name);

        if (!job) {
            return false;
        }

        job.task.start();
        return true;
    }

    stopJob(name: string): boolean {
        const job = this.jobs.get(name);

        if (!job) {
            return false;
        }

        job.task.stop();
        return true;
    }

    removeJob(name: string): boolean {
        const job = this.jobs.get(name);

        if (!job) {
            return false;
        }

        job.task.stop();
        this.jobs.delete(name);

        return true;
    }

    startAll(): void {
        for (const job of this.jobs.values()) {
            job.task.start();
        }
    }

    stopAll(): void {
        for (const job of this.jobs.values()) {
            job.task.stop();
        }
    }

    getJobStatus(): Record<string, CronJobState> {
        return Object.fromEntries(
            Array.from(this.jobs.entries()).map(([name, job]) => [
                name,
                {
                    description: job.config.description,
                    enabled: job.config.enabled,
                    running: job.running,
                    schedule: job.config.schedule,
                    lastStartedAt: job.lastStartedAt?.toISOString() ?? null,
                    lastFinishedAt: job.lastFinishedAt?.toISOString() ?? null,
                    lastError: job.lastError,
                },
            ]),
        );
    }

    shutdown(): void {
        this.stopAll();
        this.jobs.clear();
    }
}
