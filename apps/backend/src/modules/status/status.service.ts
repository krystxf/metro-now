import { CACHE_MANAGER, type Cache } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";

import { CACHE_KEYS, CACHE_TTL } from "src/constants/cache";
import { DatabaseService } from "src/modules/database/database.service";
import {
    type StatusObject,
    SystemStatus,
    SystemStatusService,
} from "src/modules/status/status.types";

@Injectable()
export class StatusService {
    constructor(
        private readonly database: DatabaseService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {}

    getBackendStatus(): StatusObject {
        return {
            service: SystemStatusService.BACKEND,
            status: SystemStatus.OK,
        };
    }

    async getGeoFunctionsStatus(): Promise<StatusObject> {
        return this.cacheManager.wrap(
            CACHE_KEYS.status.getGeoFunctionsStatus,
            async () => {
                const extensionNames = await this.database.getExtensionNames();
                const isOk =
                    extensionNames.includes("cube") &&
                    extensionNames.includes("earthdistance");

                return {
                    service: SystemStatusService.GEO_FUNCTIONS,
                    status: isOk ? SystemStatus.OK : SystemStatus.ERROR,
                };
            },
            CACHE_TTL.statusChecks,
        );
    }

    async getDbDataStatus(): Promise<StatusObject> {
        return this.cacheManager.wrap(
            CACHE_KEYS.status.getDbDataStatus,
            async () => {
                const [stopCountResult, routeCountResult, platformCountResult] =
                    await Promise.all([
                        this.database.db
                            .selectFrom("Stop")
                            .select(({ fn }) =>
                                fn.countAll<number>().as("count"),
                            )
                            .executeTakeFirstOrThrow(),
                        this.database.db
                            .selectFrom("Route")
                            .select(({ fn }) =>
                                fn.countAll<number>().as("count"),
                            )
                            .executeTakeFirstOrThrow(),
                        this.database.db
                            .selectFrom("Platform")
                            .select(({ fn }) =>
                                fn.countAll<number>().as("count"),
                            )
                            .executeTakeFirstOrThrow(),
                    ]);
                const stopCount = Number(stopCountResult.count);
                const routeCount = Number(routeCountResult.count);
                const platformCount = Number(platformCountResult.count);

                const isOk =
                    stopCount > 0 && routeCount > 0 && platformCount > 0;

                return {
                    service: SystemStatusService.DB_DATA,
                    status: isOk ? SystemStatus.OK : SystemStatus.ERROR,
                };
            },
            CACHE_TTL.statusChecks,
        );
    }
}
