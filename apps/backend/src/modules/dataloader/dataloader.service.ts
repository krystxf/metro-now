import { Injectable, Scope } from "@nestjs/common";
import * as DataLoader from "dataloader";

import { PlatformService } from "src/modules/platform/platform.service";

@Injectable({ scope: Scope.REQUEST })
export class PlatformsByStopLoader extends DataLoader<
    string,
    Awaited<ReturnType<PlatformService["getAll"]>>
> {
    constructor(private readonly platformService: PlatformService) {
        super((keys) => this.batchLoadFn(keys));
    }

    private async batchLoadFn(
        platformIds: readonly string[],
    ): Promise<Awaited<ReturnType<PlatformService["getAll"]>>[]> {
        console.log("batchLoadFn", platformIds);
        const platforms = await this.platformService.getAll({
            metroOnly: false,
            where: {
                id: {
                    in: [...platformIds],
                },
            },
        });

        // Create a map of platform ID to platform for easy lookup
        const platformMap = new Map(platforms.map((p) => [p.id, p]));

        // Return an array of arrays containing platforms matching the input keys
        return platformIds.map((id) => {
            const platform = platformMap.get(id);
            return platform ? [platform] : [];
        });
    }
}
