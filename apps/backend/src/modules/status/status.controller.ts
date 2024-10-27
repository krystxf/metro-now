import { Controller, Get } from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";

import { ApiDescription } from "src/decorators/swagger.decorator";
import { StatusService } from "src/modules/status/status.service";
import {
    StatusObject,
    SystemStatus,
    SystemStatusService,
} from "src/modules/status/status.types";

@ApiTags("status")
@Controller("status")
export class StatusController {
    constructor(private readonly statusService: StatusService) {}

    @Get()
    @ApiDescription({
        summary: "Backend status",
    })
    @ApiResponse({
        status: 200,
        isArray: true,
        example: [
            {
                service: SystemStatusService.BACKEND,
                status: SystemStatus.OK,
            },
            {
                service: SystemStatusService.GEO_FUNCTIONS,
                status: SystemStatus.OK,
            },
            {
                service: SystemStatusService.DB_DATA,
                status: SystemStatus.OK,
            },
        ],
    })
    async getBackendStatus(): Promise<StatusObject[]> {
        return [
            this.statusService.getBackendStatus(),
            await this.statusService.getGeoFunctionsStatus(),
            await this.statusService.getDbDataStatus(),
        ];
    }

    @Get("/geo-functions")
    @ApiDescription({ summary: "Geo functions status" })
    @ApiResponse({
        status: 200,
        example: {
            service: SystemStatusService.GEO_FUNCTIONS,
            status: SystemStatus.OK,
        },
    })
    async getPlatformsByDistance(): Promise<StatusObject> {
        const geoFunctionsStatus =
            await this.statusService.getGeoFunctionsStatus();

        if (geoFunctionsStatus.status === "error") {
            throw new Error("Geo functions status is not OK");
        }

        return geoFunctionsStatus;
    }

    @Get("/db-data")
    @ApiDescription({ summary: "DB data status" })
    @ApiResponse({
        status: 200,
        example: {
            service: SystemStatusService.DB_DATA,
            status: SystemStatus.OK,
        },
    })
    async getDbDataStatus(): Promise<StatusObject> {
        const dbStatus = await this.statusService.getDbDataStatus();

        if (dbStatus.status === "error") {
            throw new Error("DB data status is not OK");
        }

        return dbStatus;
    }
}
