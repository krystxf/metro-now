import { Injectable, Scope } from "@nestjs/common";
import * as DataLoader from "dataloader";

import { toLookupRouteId } from "src/modules/route/route-id.utils";
import { RouteService } from "src/modules/route/route.service";

type Route = Awaited<ReturnType<RouteService["getGraphQLByIds"]>>[number];

@Injectable({ scope: Scope.REQUEST })
export class RouteByIdLoader extends DataLoader<string, Route | null> {
    constructor(private readonly routeService: RouteService) {
        super((keys) => this.batchLoadFn(keys));
    }

    private async batchLoadFn(routeIds: readonly string[]) {
        // Callers may pass a bare PID ID ("147") or a lookup ID ("L147").
        // Normalize both so they match the keys of the route map.
        const lookupIds = routeIds.map(toLookupRouteId);
        const routes = await this.routeService.getGraphQLByIds([
            ...new Set(lookupIds),
        ]);
        const routeMap = new Map(
            routes.map((route) => [toLookupRouteId(route.id), route]),
        );

        return lookupIds.map((id) => routeMap.get(id) ?? null);
    }
}
