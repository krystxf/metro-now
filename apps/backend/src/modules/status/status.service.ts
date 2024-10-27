import { Injectable } from "@nestjs/common";

import { PrismaService } from "src/modules/prisma/prisma.service";
import {
    StatusObject,
    SystemStatus,
    SystemStatusService,
} from "src/modules/status/status.types";

@Injectable()
export class StatusService {
    constructor(private prisma: PrismaService) {}

    getBackendStatus(): StatusObject {
        return {
            service: SystemStatusService.BACKEND,
            status: SystemStatus.OK,
        };
    }

    async getGeoFunctionsStatus(): Promise<StatusObject> {
        const extensionNames = await this.prisma.getExtensionNames();
        const isOk =
            extensionNames.includes("cube") &&
            extensionNames.includes("earthdistance");

        return {
            service: SystemStatusService.GEO_FUNCTIONS,
            status: isOk ? SystemStatus.OK : SystemStatus.ERROR,
        };
    }

    async getDbDataStatus(): Promise<StatusObject> {
        const stopCount = await this.prisma.stop.count();
        const routeCount = await this.prisma.route.count();
        const platformCount = await this.prisma.platform.count();

        const isOk = stopCount > 0 && routeCount > 0 && platformCount > 0;

        return {
            service: SystemStatusService.DB_DATA,
            status: isOk ? SystemStatus.OK : SystemStatus.ERROR,
        };
    }
}
