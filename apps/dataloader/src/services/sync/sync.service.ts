import type { DatabaseClient } from "@metro-now/database";

import type {
    SyncRunResult,
    SyncSnapshot,
    SyncTrigger,
    SyncedStop,
} from "../../types/sync.types";
import { logger } from "../../utils/logger";
import type { CacheInvalidationService } from "../core/cache-invalidation.service";
import { CountryLookupService } from "../geo/country-lookup.service";
import { GtfsService } from "../gtfs/gtfs.service";
import { cityImports } from "../imports/city-imports.registry";
import { PidImportService } from "../imports/pid-import.service";
import { mergeSnapshots } from "./sync-merge.utils";
import { SyncRepository } from "./sync-repository.service";
import { SyncSnapshotValidator } from "./sync-snapshot-validator.service";

export class SyncService {
    private readonly importService = new PidImportService();
    private readonly gtfsService = new GtfsService();
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

        const merged = mergeSnapshots(
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
        const context = { pidStops };
        const results: SyncSnapshot[] = [];

        for (const cityImport of cityImports) {
            try {
                const snapshot = await cityImport.load(context);

                logger.info(`${cityImport.name} snapshot ready`, {
                    stops: snapshot.stops.length,
                    platforms: snapshot.platforms.length,
                    routes: snapshot.gtfsRoutes.length,
                });
                results.push(snapshot);
            } catch (error) {
                logger.error(
                    `Failed to fetch ${cityImport.name} data, continuing without it`,
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
