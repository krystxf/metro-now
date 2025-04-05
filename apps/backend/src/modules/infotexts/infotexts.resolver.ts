import { Query, Resolver } from "@nestjs/graphql";

import { InfotextsService } from "src/modules/infotexts/infotexts.service";
import { IQuery } from "src/types/graphql.generated";

@Resolver()
export class InfotextsResolver {
    constructor(private readonly infotextsService: InfotextsService) {}

    @Query("infotexts")
    async infotexts(): Promise<IQuery["infotexts"]> {
        return (await this.infotextsService.getInfotexts()).map((infotext) => ({
            ...infotext,
            relatedStops: infotext.relatedStops as any[],
        }));
    }
}
