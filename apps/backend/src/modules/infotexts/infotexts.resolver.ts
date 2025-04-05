import { Query, Resolver } from "@nestjs/graphql";

import { InfotextsService } from "src/modules/infotexts/infotexts.service";
import { InfotextPriority, IQuery } from "src/types/graphql.generated";

@Resolver()
export class InfotextsResolver {
    constructor(private readonly infotextsService: InfotextsService) {}

    @Query("infotexts")
    async infotexts(): Promise<IQuery["infotexts"]> {
        return (await this.infotextsService.getAll()).map((infotext) => ({
            ...infotext,
            priority: infotext.priority as InfotextPriority,
            relatedStops: infotext.relatedStops as any[],
        }));
    }
}
