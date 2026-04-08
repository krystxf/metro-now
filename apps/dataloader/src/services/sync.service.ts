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
    private readonly phaseDelayMs: number;
    private activeSync: Promise<SyncRunResult> | undefined;
    private lastRun: SyncRunResult | undefined;

    constructor(
        db: DatabaseClient,
        options: {
            entityBatchSize?: number;
            relationBatchSize?: number;
            batchDelayMs?: number;
            phaseDelayMs?: number;
        } = {},
    ) {
        this.repository = new SyncRepository(db, options);
        this.phaseDelayMs = options.phaseDelayMs ?? 0;
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

        this.logGtfsStationEntranceSnapshot(snapshot);

        this.validator.validate(snapshot);
        await this.pauseBetweenPhases(
            "snapshot validation",
            "database persistence",
        );

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
        await this.pauseBetweenPhases("PID snapshot", "GTFS snapshot");
        const gtfsSnapshot = await this.gtfsService.getGtfsSnapshot({
            platformIds: new Set(
                stopSnapshot.platforms.map((platform) => platform.id),
            ),
            importedMetroStopIds: new Set(
                stopSnapshot.platforms.flatMap((platform) =>
                    platform.isMetro && platform.stopId
                        ? [platform.stopId]
                        : [],
                ),
            ),
        });

        return {
            ...stopSnapshot,
            ...gtfsSnapshot,
        };
    }

    private logGtfsStationEntranceSnapshot(
        snapshot: Pick<SyncSnapshot, "gtfsStationEntrances" | "platforms">,
    ): void {
        const metroStopIds = new Set(
            snapshot.platforms.flatMap((platform) =>
                platform.isMetro && platform.stopId ? [platform.stopId] : [],
            ),
        );
        const gtfsStationEntranceStopIds = new Set(
            snapshot.gtfsStationEntrances.map((entrance) => entrance.stopId),
        );

        logger.info("Prepared GTFS station entrance snapshot", {
            gtfsStationEntrances: snapshot.gtfsStationEntrances.length,
            gtfsStationEntranceStops: gtfsStationEntranceStopIds.size,
            metroStops: metroStopIds.size,
        });
    }

    private async pauseBetweenPhases(
        completedPhase: string,
        nextPhase: string,
    ): Promise<void> {
        if (this.phaseDelayMs <= 0) {
            return;
        }

        logger.info("Throttling sync phase transition", {
            completedPhase,
            nextPhase,
            delayMs: this.phaseDelayMs,
        });

        await new Promise((resolve) => setTimeout(resolve, this.phaseDelayMs));
    }
}
