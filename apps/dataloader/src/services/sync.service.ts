import type { DatabaseClient } from "@metro-now/database";

import type {
    SyncRunResult,
    SyncSnapshot,
    SyncTrigger,
} from "../types/sync.types";
import { logger } from "../utils/logger";
import { GtfsService } from "./gtfs.service";
import { PidImportService } from "./pid-import.service";
import { SyncRepository } from "./sync-repository.service";
import { SyncSnapshotValidator } from "./sync-snapshot-validator.service";

export class SyncService {
    private readonly importService = new PidImportService();
    private readonly gtfsService = new GtfsService();
    private readonly validator = new SyncSnapshotValidator();
    private readonly repository: SyncRepository;
    private activeSync: Promise<SyncRunResult> | undefined;
    private lastRun: SyncRunResult | undefined;

    constructor(db: DatabaseClient) {
        this.repository = new SyncRepository(db);
    }

    async syncEverything(trigger: SyncTrigger): Promise<SyncRunResult> {
        if (this.activeSync) {
            logger.warn("Sync already running, reusing active run", {
                trigger,
            });

            return this.activeSync;
        }

        const run = this.executeSync(trigger).finally(() => {
            if (this.activeSync === run) {
                this.activeSync = undefined;
            }
        });

        this.activeSync = run;

        return run;
    }

    getStatus(): {
        running: boolean;
        lastRun?: SyncRunResult;
    } {
        return {
            running: this.activeSync !== undefined,
            lastRun: this.lastRun,
        };
    }

    private async executeSync(trigger: SyncTrigger): Promise<SyncRunResult> {
        const startedAt = new Date();

        logger.info(`Starting ${trigger} sync`);

        const snapshot = await this.createSnapshot();

        this.validator.validate(snapshot);

        const persistenceResult = await this.repository.persist(snapshot);
        const finishedAt = new Date();
        const result: SyncRunResult =
            persistenceResult.status === "success"
                ? {
                      status: "success",
                      trigger,
                      startedAt,
                      finishedAt,
                      durationMs: finishedAt.getTime() - startedAt.getTime(),
                      counts: persistenceResult.counts,
                  }
                : {
                      status: "skipped",
                      trigger,
                      startedAt,
                      finishedAt,
                      durationMs: finishedAt.getTime() - startedAt.getTime(),
                      reason: persistenceResult.reason,
                  };

        this.lastRun = result;

        if (result.status === "success") {
            logger.info(`Finished ${trigger} sync`, {
                durationMs: result.durationMs,
                counts: result.counts,
            });
        } else {
            logger.warn(`Skipped ${trigger} sync`, {
                durationMs: result.durationMs,
                reason: result.reason,
            });
        }

        return result;
    }

    private async createSnapshot(): Promise<SyncSnapshot> {
        const stopSnapshot = await this.importService.getStopSnapshot();
        const gtfsSnapshot = await this.gtfsService.getGtfsSnapshot(
            new Set(stopSnapshot.platforms.map((platform) => platform.id)),
        );

        return {
            ...stopSnapshot,
            ...gtfsSnapshot,
        };
    }
}
