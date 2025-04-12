import { Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

import { InfotextsService } from "src/modules/infotexts/infotexts.service";
import { PlatformService } from "src/modules/platform/platform.service";
import { ParentType } from "src/types/parent";

@Resolver("Infotext")
export class InfotextsResolver {
    constructor(
        private readonly infotextsService: InfotextsService,
        private readonly platformService: PlatformService,
    ) {}

    @Query("infotexts")
    getMultiple() {
        return this.infotextsService.getAll();
    }

    @ResolveField("relatedPlatforms")
    getRelatedPlatformsField(
        @Parent()
        infotext: ParentType<typeof this.getMultiple>,
    ) {
        const ids = infotext.relatedPlatforms.map(({ id }) => id);

        return this.platformService.getAll({
            metroOnly: false,
            where: { id: { in: ids } },
        });
    }
}
