import { Cache, CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";

import { CACHE_KEYS, ttl } from "src/constants/cache";
import { PrismaService } from "src/modules/prisma/prisma.service";
import {
    StatusObject,
    SystemStatus,
    SystemStatusService,
} from "src/modules/status/status.types";

@Injectable()
export class StatusService {
    constructor(
        private prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
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
                const extensionNames = await this.prisma.getExtensionNames();
                const isOk =
                    extensionNames.includes("cube") &&
                    extensionNames.includes("earthdistance");

                return {
                    service: SystemStatusService.GEO_FUNCTIONS,
                    status: isOk ? SystemStatus.OK : SystemStatus.ERROR,
                };
            },
            ttl({ seconds: 30 }),
        );
    }

    async getDbDataStatus(): Promise<StatusObject> {
        return this.cacheManager.wrap(
            CACHE_KEYS.status.getDbDataStatus,
            async () => {
                const stopCount = await this.prisma.stop.count();
                const routeCount = await this.prisma.route.count();
                const platformCount = await this.prisma.platform.count();

                const isOk =
                    stopCount > 0 && routeCount > 0 && platformCount > 0;

                return {
                    service: SystemStatusService.DB_DATA,
                    status: isOk ? SystemStatus.OK : SystemStatus.ERROR,
                };
            },
            ttl({ seconds: 30 }),
        );
    }
}
