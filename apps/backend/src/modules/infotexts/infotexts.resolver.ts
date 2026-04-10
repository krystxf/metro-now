import { Query, Resolver } from "@nestjs/graphql";

import { InfotextsService } from "src/modules/infotexts/infotexts.service";

@Resolver("Infotext")
export class InfotextsResolver {
    constructor(private readonly infotextsService: InfotextsService) {}

    @Query("infotexts")
    getMultiple() {
        return this.infotextsService.getAll();
    }
}
