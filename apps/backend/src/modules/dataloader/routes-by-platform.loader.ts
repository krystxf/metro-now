import { Injectable, Scope } from "@nestjs/common";
import * as DataLoader from "dataloader";

import { RouteService } from "src/modules/route/route.service";

type Route = Awaited<ReturnType<RouteService["getOneGraphQL"]>>;

@Injectable({ scope: Scope.REQUEST })
export class RoutesByPlatformIdLoader extends DataLoader<string, Route[]> {
    constructor(private readonly routeService: RouteService) {
        super((keys) => this.batchLoadFn(keys));
    }

    private async batchLoadFn(
        platformIds: readonly string[],
    ): Promise<Route[][]> {
        const routes = await this.routeService.getManyGraphQL({
            where: {
                GtfsRouteStop: {
                    some: {
                        platform: {
                            id: { in: [...platformIds] },
                        },
                    },
                },
            },
        });
        return platformIds.map(() => routes);
    }
}
