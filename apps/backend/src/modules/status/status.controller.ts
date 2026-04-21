import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";

import { StatusService } from "src/modules/status/status.service";
import { type StatusObject } from "src/modules/status/status.types";

@Controller({
    path: "status",
    version: VERSION_NEUTRAL,
})
export class StatusController {
    constructor(private readonly statusService: StatusService) {}

    @Get()
    async getBackendStatus(): Promise<StatusObject[]> {
        return [
            this.statusService.getBackendStatus(),
            await this.statusService.getGeoFunctionsStatus(),
            await this.statusService.getDbDataStatus(),
        ];
    }

    @Get("/geo-functions")
    async getPlatformsByDistance(): Promise<StatusObject> {
        const geoFunctionsStatus =
            await this.statusService.getGeoFunctionsStatus();

        if (geoFunctionsStatus.status === "error") {
            throw new Error("Geo functions status is not OK");
        }

        return geoFunctionsStatus;
    }

    @Get("/db-data")
    async getDbDataStatus(): Promise<StatusObject> {
        const dbStatus = await this.statusService.getDbDataStatus();

        if (dbStatus.status === "error") {
            throw new Error("DB data status is not OK");
        }

        return dbStatus;
    }
}
