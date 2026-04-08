import { Injectable, Scope } from "@nestjs/common";
import * as DataLoader from "dataloader";

import { RouteService } from "src/modules/route/route.service";

type Route = Awaited<ReturnType<RouteService["getGraphQLByIds"]>>[number];

@Injectable({ scope: Scope.REQUEST })
export class RouteByIdLoader extends DataLoader<string, Route | null> {
    constructor(private readonly routeService: RouteService) {
        super((keys) => this.batchLoadFn(keys));
    }

    private async batchLoadFn(routeIds: readonly string[]) {
        const routes = await this.routeService.getGraphQLByIds(routeIds);
        const routeMap = new Map(
            routes.map((route) => [`L${route.id}`, route]),
        );

        return routeIds.map((id) => routeMap.get(id) ?? null);
    }
}
