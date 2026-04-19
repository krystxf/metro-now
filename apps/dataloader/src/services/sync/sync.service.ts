import type { DatabaseClient } from "@metro-now/database";

import type {
    GtfsSnapshot,
    StopSnapshot,
    SyncRunResult,
    SyncSnapshot,
    SyncTrigger,
    SyncedStop,
} from "../../types/sync.types";
import { logger } from "../../utils/logger";
import type { CacheInvalidationService } from "../core/cache-invalidation.service";
import { CountryLookupService } from "../geo/country-lookup.service";
import { GtfsService } from "../gtfs/gtfs.service";
import { BratislavaImportService } from "../imports/bratislava-import.service";
import { BrnoImportService } from "../imports/brno-import.service";
import { LeoImportService } from "../imports/leo-import.service";
import { LiberecImportService } from "../imports/liberec-import.service";
import { PidImportService } from "../imports/pid-import.service";
import { PmdpImportService } from "../imports/pmdp-import.service";
import { UstiImportService } from "../imports/usti-import.service";
import { ZsrImportService } from "../imports/zsr-import.service";
import { SyncRepository } from "./sync-repository.service";
import { SyncSnapshotValidator } from "./sync-snapshot-validator.service";

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
    private readonly countryLookupService = new CountryLookupService();
    private readonly validator = new SyncSnapshotValidator();
    private readonly repository: SyncRepository;
    private readonly cacheInvalidation: CacheInvalidationService | null;
    private activeSync: Promise<SyncRunResult> | undefined;
    private lastRun: SyncRunResult | undefined;

    constructor(
        db: DatabaseClient,
        options: {
            entityBatchSize?: number;
            relationBatchSize?: number;
            cacheInvalidation?: CacheInvalidationService;
        } = {},
    ) {
        this.repository = new SyncRepository(db, options);
        this.cacheInvalidation = options.cacheInvalidation ?? null;
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
                      changedEntities: persistenceResult.changedEntities,
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
                changedEntities: result.changedEntities,
            });

            if (this.cacheInvalidation && result.changedEntities) {
                try {
                    await this.cacheInvalidation.invalidateForChangedEntities(
                        result.changedEntities,
                    );
                } catch (error) {
                    logger.error("Failed to invalidate backend caches", {
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    });
                }
            }
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

        const citySnapshots = await this.loadCitySnapshots(stopSnapshot.stops);

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

        merged.stops = await this.enrichStopsWithCountry(merged.stops);

        return merged;
    }

    private async enrichStopsWithCountry(
        stops: SyncedStop[],
    ): Promise<SyncedStop[]> {
        const countryCounts = new Map<string, number>();
        let nullCount = 0;

        const enriched = await Promise.all(
            stops.map(async (stop) => {
                const country = await this.countryLookupService.getCountry(
                    stop.avgLatitude,
                    stop.avgLongitude,
                );

                if (country) {
                    countryCounts.set(
                        country,
                        (countryCounts.get(country) ?? 0) + 1,
                    );
                } else {
                    nullCount += 1;
                }

                return { ...stop, country };
            }),
        );

        logger.info("Resolved stop countries", {
            byCountry: Object.fromEntries(countryCounts),
            unresolved: nullCount,
        });

        return enriched;
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
}
