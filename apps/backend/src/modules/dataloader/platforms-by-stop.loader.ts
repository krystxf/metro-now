import { Injectable, Scope } from "@nestjs/common";
import * as DataLoader from "dataloader";

import { PlatformService } from "src/modules/platform/platform.service";

@Injectable({ scope: Scope.REQUEST })
export class PlatformsByStopLoader extends DataLoader<string, unknown> {
    constructor(private readonly platformService: PlatformService) {
        super((keys) => this.batchLoadFn(keys));
    }

    private async batchLoadFn(platformIds: readonly string[]) {
        const platforms = await this.platformService.getAllGraphQL({
            metroOnly: false,
            where: {
                id: {
                    in: [...platformIds],
                },
            },
        });

        const platformMap = new Map(platforms.map((p) => [p.id, p]));

        return platformIds.map((id) => platformMap.get(id) ?? null);
    }
}
