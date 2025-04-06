import { Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

import { InfotextsService } from "src/modules/infotexts/infotexts.service";
import { PlatformService } from "src/modules/platform/platform.service";
import {
    Infotext,
    InfotextPriority,
    IQuery,
} from "src/types/graphql.generated";

@Resolver("Infotext")
export class InfotextsResolver {
    constructor(
        private readonly infotextsService: InfotextsService,
        private readonly platformService: PlatformService,
    ) {}

    @Query("infotexts")
    async infotexts(): Promise<IQuery["infotexts"]> {
        return (await this.infotextsService.getAll()).map((infotext) => ({
            ...infotext,
            priority: infotext.priority as InfotextPriority,
            relatedPlatforms: infotext.relatedStops as any[],
        }));
    }

    @ResolveField("relatedPlatforms")
    getRelatedPlatforms(@Parent() infotext: Infotext) {
        const ids = infotext.relatedPlatforms.map(({ id }) => id);

        return this.platformService.getAll({
            metroOnly: false,
            where: { id: { in: ids } },
        });
    }
}
