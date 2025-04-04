import { Injectable } from "@nestjs/common";

import { GolemioService } from "src/modules/golemio/golemio.service";
import { golemioInfoTextsSchema } from "src/modules/infotexts/golemio-infotext.schema";

@Injectable()
export class InfotextsService {
    constructor(private golemioService: GolemioService) {}

    async getInfotexts() {
        const res =
            await this.golemioService.getGolemioData(`/v3/pid/infotexts`);

        if (!res.ok) {
            throw new Error(
                `Failed to fetch infotexts: ${res.status} ${res.statusText}`,
            );
        }

        const json = await res.json();
        const parsed = golemioInfoTextsSchema.safeParse(json);

        if (!parsed.success) {
            throw new Error(parsed.error.message);
        }

        return parsed.data.map((infotext) => ({
            validFrom: infotext.valid_from,
            validTo: infotext.valid_to,
            text: infotext.text,
            textEn: infotext.text_en,
            displayType: infotext.display_type,
            priority: infotext.priority,
            relatedStops: infotext.related_stops.map((stop) => ({
                id: stop.id,
                name: stop.name,
                platformCode: stop.platform_code,
            })),
            id: infotext.id,
        }));
    }
}
