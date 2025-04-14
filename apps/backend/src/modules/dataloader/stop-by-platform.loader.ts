import { Injectable, Scope } from "@nestjs/common";
import * as DataLoader from "dataloader";

import { StopService } from "src/modules/stop/stop.service";

@Injectable({ scope: Scope.REQUEST })
export class StopByPlatformLoader extends DataLoader<string, unknown> {
    constructor(private readonly stopService: StopService) {
        super((keys) => this.batchLoadFn(keys));
    }

    private async batchLoadFn(stopIds: readonly string[]) {
        const stops = await this.stopService.getAllGraphQL({
            where: {
                id: {
                    in: [...stopIds],
                },
            },
        });

        const stopMap = new Map(stops.map((stop) => [stop.id, stop]));

        return stopIds.map((id) => stopMap.get(id) ?? null);
    }
}
