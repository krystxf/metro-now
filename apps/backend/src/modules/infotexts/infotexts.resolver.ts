import { Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

import { InfotextsService } from "src/modules/infotexts/infotexts.service";
import { PrismaService } from "src/modules/prisma/prisma.service";
import {
    Infotext,
    InfotextPriority,
    IQuery,
} from "src/types/graphql.generated";

@Resolver("Infotext")
export class InfotextsResolver {
    constructor(
        private readonly infotextsService: InfotextsService,
        private prisma: PrismaService,
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
        const ids = infotext.relatedPlatforms.map((p) => p.id);

        return this.prisma.platform.findMany({
            where: { id: { in: ids } },
        });
    }
}
