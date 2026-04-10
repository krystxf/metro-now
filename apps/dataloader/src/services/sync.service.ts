import type { DatabaseClient } from "@metro-now/database";

import type {
    GtfsSnapshot,
    StopSnapshot,
    SyncRunResult,
    SyncSnapshot,
    SyncTrigger,
} from "../types/sync.types";
import { logger } from "../utils/logger";
import { BratislavaImportService } from "./bratislava-import.service";
import { BrnoImportService } from "./brno-import.service";
import { GtfsService } from "./gtfs.service";
import { LeoImportService } from "./leo-import.service";
import { LiberecImportService } from "./liberec-import.service";
import { PidImportService } from "./pid-import.service";
import { PmdpImportService } from "./pmdp-import.service";
import { SyncRepository } from "./sync-repository.service";
import { SyncSnapshotValidator } from "./sync-snapshot-validator.service";
import { UstiImportService } from "./usti-import.service";
import { ZsrImportService } from "./zsr-import.service";

export class SyncService {
    private readonly importService = new PidImportService();
    private readonly gtfsService = new GtfsService();
    private readonly leoImportService = new LeoImportService();
    private readonly pmdpImportService = new PmdpImportService();
    private readonly brnoImportService = new BrnoImportService();
    private readonly ustiImportService = new UstiImportService();
    private readonly liberecImportService = new LiberecImportService();
    private readonly bratislavaImportService = new BratislavaImportService();
    private readonly zsrImportService = new ZsrImportService();
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
        await this.pauseBetweenPhases("PID snapshot", "Leo snapshot");

        const citySnapshots = await this.loadCitySnapshots(stopSnapshot.stops);

        await this.pauseBetweenPhases("city snapshots", "GTFS snapshot");

        const allPlatforms = stopSnapshot.platforms.concat(
            citySnapshots.flatMap((snapshot) => snapshot.platforms),
        );
        const gtfsSnapshot = await this.gtfsService.getGtfsSnapshot({
            platformIds: new Set(allPlatforms.map((platform) => platform.id)),
            importedMetroStopIds: new Set(
                stopSnapshot.platforms.flatMap((platform) =>
                    platform.isMetro && platform.stopId
                        ? [platform.stopId]
                        : [],
                ),
            ),
        });

        const merged = this.mergeSnapshots(
            stopSnapshot,
            gtfsSnapshot,
            citySnapshots,
            allPlatforms,
        );
        citySnapshots.length = 0;

        return merged;
    }

    private async loadCitySnapshots(
        pidStops: SyncSnapshot["stops"],
    ): Promise<SyncSnapshot[]> {
        type CityLoader = {
            name: string;
            load: () => Promise<SyncSnapshot>;
        };

        const loaders: CityLoader[] = [
            {
                name: "Leo",
                load: () => this.leoImportService.getLeoSnapshot(pidStops),
            },
            {
                name: "PMDP",
                load: () => this.pmdpImportService.getPmdpSnapshot(),
            },
            {
                name: "Brno",
                load: () => this.brnoImportService.getBrnoSnapshot(),
            },
            {
                name: "Usti",
                load: () => this.ustiImportService.getUstiSnapshot(),
            },
            {
                name: "Liberec",
                load: () => this.liberecImportService.getLiberecSnapshot(),
            },
            {
                name: "Bratislava",
                load: () =>
                    this.bratislavaImportService.getBratislavaSnapshot(),
            },
            {
                name: "ZSR",
                load: () => this.zsrImportService.getZsrSnapshot(pidStops),
            },
        ];

        const results: SyncSnapshot[] = [];

        for (const loader of loaders) {
            try {
                const snapshot = await loader.load();

                logger.info(`${loader.name} snapshot ready`, {
                    stops: snapshot.stops.length,
                    platforms: snapshot.platforms.length,
                    routes: snapshot.routes.length,
                });
                results.push(snapshot);
            } catch (error) {
                logger.error(
                    `Failed to fetch ${loader.name} data, continuing without it`,
                    {
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    },
                );
            }

            await this.pauseBetweenPhases(
                `${loader.name} snapshot`,
                "next snapshot",
            );
        }

        return results;
    }

    private mergeSnapshots(
        stopSnapshot: StopSnapshot,
        gtfsSnapshot: GtfsSnapshot,
        citySnapshots: SyncSnapshot[],
        allPlatforms: SyncSnapshot["platforms"],
    ): SyncSnapshot {
        const stops = [stopSnapshot.stops];
        const routes = [stopSnapshot.routes];
        const platformRoutes = [stopSnapshot.platformRoutes];
        const gtfsRoutes = [gtfsSnapshot.gtfsRoutes];
        const gtfsRouteStops = [gtfsSnapshot.gtfsRouteStops];
        const gtfsRouteShapes = [gtfsSnapshot.gtfsRouteShapes];
        const gtfsStationEntrances = [gtfsSnapshot.gtfsStationEntrances];
        const gtfsTrips = [gtfsSnapshot.gtfsTrips];
        const gtfsStopTimes = [gtfsSnapshot.gtfsStopTimes];
        const gtfsCalendars = [gtfsSnapshot.gtfsCalendars];
        const gtfsCalendarDates = [gtfsSnapshot.gtfsCalendarDates];
        const gtfsTransfers = [gtfsSnapshot.gtfsTransfers];

        for (const snapshot of citySnapshots) {
            stops.push(snapshot.stops);
            routes.push(snapshot.routes);
            platformRoutes.push(snapshot.platformRoutes);
            gtfsRoutes.push(snapshot.gtfsRoutes);
            gtfsRouteStops.push(snapshot.gtfsRouteStops);
            gtfsRouteShapes.push(snapshot.gtfsRouteShapes);
            gtfsStationEntrances.push(snapshot.gtfsStationEntrances);
            gtfsTrips.push(snapshot.gtfsTrips);
            gtfsStopTimes.push(snapshot.gtfsStopTimes);
            gtfsCalendars.push(snapshot.gtfsCalendars);
            gtfsCalendarDates.push(snapshot.gtfsCalendarDates);
            gtfsTransfers.push(snapshot.gtfsTransfers);
        }

        return {
            stops: stops.flat(),
            platforms: allPlatforms,
            routes: routes.flat(),
            platformRoutes: platformRoutes.flat(),
            gtfsRoutes: gtfsRoutes.flat(),
            gtfsRouteStops: gtfsRouteStops.flat(),
            gtfsRouteShapes: gtfsRouteShapes.flat(),
            gtfsStationEntrances: gtfsStationEntrances.flat(),
            gtfsTrips: gtfsTrips.flat(),
            gtfsStopTimes: gtfsStopTimes.flat(),
            gtfsCalendars: gtfsCalendars.flat(),
            gtfsCalendarDates: gtfsCalendarDates.flat(),
            gtfsTransfers: gtfsTransfers.flat(),
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
