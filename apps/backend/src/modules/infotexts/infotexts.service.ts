import { Injectable } from "@nestjs/common";

import { GolemioService } from "src/modules/golemio/golemio.service";
import { golemioResponseSchema } from "src/modules/infotexts/schema/golemio-response.schema";
import { responseSchema } from "src/modules/infotexts/schema/response.schema";

@Injectable()
export class InfotextsService {
    constructor(private golemioService: GolemioService) {}

    async getAll() {
        const res =
            await this.golemioService.getGolemioData(`/v3/pid/infotexts`);

        if (!res.ok) {
            throw new Error(
                `Failed to fetch infotexts: ${res.status} ${res.statusText}`,
            );
        }

        const json = await res.json();
        const parsed = golemioResponseSchema.safeParse(json);

        if (!parsed.success) {
            throw new Error(parsed.error.message);
        }

        const parsedResponse = parsed.data.map((infotext) => ({
            ...infotext,
            textEn: infotext.text_en,
            displayType: infotext.display_type,
            relatedStops: infotext.related_stops.map((stop) => ({
                ...stop,
                platformCode: stop.platform_code,
            })),
            validFrom: infotext.valid_from,
            validTo: infotext.valid_to,
        }));

        return responseSchema.parse(parsedResponse);
    }
}
