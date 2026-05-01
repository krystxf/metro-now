import {
    Args,
    Info,
    Parent,
    Query,
    ResolveField,
    Resolver,
} from "@nestjs/graphql";
import type {
    FieldNode,
    FragmentDefinitionNode,
    GraphQLResolveInfo,
    SelectionNode,
    SelectionSetNode,
} from "graphql";

import { PlatformsByStopLoader } from "src/modules/dataloader/platforms-by-stop.loader";
import { StopService } from "src/modules/stop/stop.service";
import type { ParentType } from "src/types/parent";

const MAX_CLOSEST_STOPS_LIMIT = 100;
const STOP_HYDRATED_FIELD_NAMES = new Set([
    "entrances",
    "platforms",
    "isMetro",
    "vehicleTypes",
]);

const selectionSetRequestsHydratedStopFields = ({
    fragments,
    selectionSet,
}: {
    fragments: Record<string, FragmentDefinitionNode>;
    selectionSet: SelectionSetNode | undefined;
}): boolean => {
    if (!selectionSet) {
        return false;
    }

    for (const selection of selectionSet.selections) {
        if (
            selectionRequestsHydratedStopFields({
                fragments,
                selection,
            })
        ) {
            return true;
        }
    }

    return false;
};

const selectionRequestsHydratedStopFields = ({
    fragments,
    selection,
}: {
    fragments: Record<string, FragmentDefinitionNode>;
    selection: SelectionNode;
}): boolean => {
    switch (selection.kind) {
        case "Field":
            return STOP_HYDRATED_FIELD_NAMES.has(selection.name.value);
        case "InlineFragment":
            return selectionSetRequestsHydratedStopFields({
                fragments,
                selectionSet: selection.selectionSet,
            });
        case "FragmentSpread":
            return selectionSetRequestsHydratedStopFields({
                fragments,
                selectionSet: fragments[selection.name.value]?.selectionSet,
            });
    }

    return false;
};

const shouldHydrateStopGraphqlFields = (
    info: GraphQLResolveInfo | undefined,
): boolean => {
    if (!info) {
        return true;
    }

    return info.fieldNodes.some((fieldNode: FieldNode) =>
        selectionSetRequestsHydratedStopFields({
            fragments: info.fragments,
            selectionSet: fieldNode.selectionSet,
        }),
    );
};

const hasHydratedPlatformFields = (platform: { id: string }): platform is {
    id: string;
    latitude: number;
} => "latitude" in platform && typeof platform.latitude === "number";

@Resolver("Stop")
export class StopResolver {
    constructor(
        private readonly stopService: StopService,
        private readonly platformsByStopLoader: PlatformsByStopLoader,
    ) {}

    @Query("stop")
    async getOne(@Args("id") id: string, @Info() info?: GraphQLResolveInfo) {
        const [stop] = await this.stopService.getGraphQLByIds([id], {
            hydrateFields: shouldHydrateStopGraphqlFields(info),
        });

        return stop ?? null;
    }

    @Query("stops")
    async getMultiple(
        @Args("ids") ids: string[] | undefined,
        @Args("limit") limit: number | undefined,
        @Args("offset") offset: number | undefined,
        @Info() info?: GraphQLResolveInfo,
    ) {
        const hydrateFields = shouldHydrateStopGraphqlFields(info);

        if (ids && ids.length > 0) {
            const stops = await this.stopService.getGraphQLByIds(ids, {
                hydrateFields,
            });
            const start = offset ?? 0;
            const end = typeof limit === "number" ? start + limit : undefined;

            return stops.slice(start, end);
        }

        const res = await this.stopService.getAllGraphQL({
            ...(typeof limit === "number" ? { limit } : {}),
            ...(typeof offset === "number" ? { offset } : {}),
            hydrateFields,
        });

        return res;
    }

    @Query("searchStops")
    search(
        @Args("query") query: string,
        @Args("limit") limit: number | undefined,
        @Args("offset") offset: number | undefined,
        @Args("latitude") latitude: number | undefined,
        @Args("longitude") longitude: number | undefined,
        @Info() info?: GraphQLResolveInfo,
    ) {
        return this.stopService.searchGraphQL({
            query,
            ...(typeof limit === "number" ? { limit } : {}),
            ...(typeof offset === "number" ? { offset } : {}),
            ...(typeof latitude === "number" && typeof longitude === "number"
                ? { latitude, longitude }
                : {}),
            hydrateFields: shouldHydrateStopGraphqlFields(info),
        });
    }

    @Query("closestStops")
    getClosest(
        @Args("latitude") latitude: number,
        @Args("longitude") longitude: number,
        @Args("limit") limit: number | undefined,
        @Info() info?: GraphQLResolveInfo,
    ) {
        const clampedLimit = Math.min(
            MAX_CLOSEST_STOPS_LIMIT,
            Math.max(1, limit ?? MAX_CLOSEST_STOPS_LIMIT),
        );

        return this.stopService.getClosestStopsGraphQL({
            latitude,
            longitude,
            limit: clampedLimit,
            hydrateFields: shouldHydrateStopGraphqlFields(info),
        });
    }

    @Query("stopDataLastUpdatedAt")
    getDataLastUpdatedAt() {
        return this.stopService.getDataLastUpdatedAt();
    }

    @ResolveField("platforms")
    getPlatformsField(
        @Parent()
        stop: ParentType<typeof this.getMultiple>,
    ) {
        if (
            stop.platforms.length === 0 ||
            hasHydratedPlatformFields(stop.platforms[0])
        ) {
            return stop.platforms;
        }

        const platformIds = stop.platforms.map((platform) => platform.id);
        return this.platformsByStopLoader.loadMany(platformIds);
    }
}

@Resolver("StopWithDistance")
export class StopWithDistanceResolver {
    constructor(
        private readonly platformsByStopLoader: PlatformsByStopLoader,
    ) {}

    @ResolveField("platforms")
    getPlatformsField(@Parent() stop: { platforms: { id: string }[] }) {
        if (
            stop.platforms.length === 0 ||
            hasHydratedPlatformFields(stop.platforms[0])
        ) {
            return stop.platforms;
        }

        const platformIds = stop.platforms.map((platform) => platform.id);
        return this.platformsByStopLoader.loadMany(platformIds);
    }
}
