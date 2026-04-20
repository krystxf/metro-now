import { CACHE_MANAGER, type Cache } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { z } from "zod";

import { CACHE_KEYS, CACHE_TTL } from "src/constants/cache";
import { GolemioService } from "src/modules/golemio/golemio.service";
import { golemioResponseSchema } from "src/modules/infotexts/schema/golemio-response.schema";
import { responseSchema } from "src/modules/infotexts/schema/response.schema";

type InfotextsResponse = z.infer<typeof responseSchema>;

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
};

@Injectable()
export class InfotextsService {
    private readonly logger = new Logger(InfotextsService.name);

    constructor(
        private readonly golemioService: GolemioService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {}

    private async _getAll(): Promise<InfotextsResponse> {
        const data =
            await this.golemioService.getGolemioData("/v3/pid/infotexts");

        const parsed = golemioResponseSchema.safeParse(data);

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

    private async setFallbackCache(
        infotexts: InfotextsResponse,
    ): Promise<void> {
        try {
            await this.cacheManager.set(
                CACHE_KEYS.infotexts.getAllFallback,
                infotexts,
                CACHE_TTL.infotextsFallback,
            );
        } catch (error) {
            this.logger.warn(
                `Failed to update infotexts fallback cache: ${getErrorMessage(error)}`,
            );
        }
    }

    private async getFallbackCache(): Promise<InfotextsResponse | null> {
        return (
            (await this.cacheManager.get<InfotextsResponse>(
                CACHE_KEYS.infotexts.getAllFallback,
            )) ?? null
        );
    }

    async getAll() {
        return this.cacheManager.wrap(
            CACHE_KEYS.infotexts.getAll,
            async () => {
                try {
                    const infotexts = await this._getAll();
                    await this.setFallbackCache(infotexts);

                    return infotexts;
                } catch (error) {
                    const fallback = await this.getFallbackCache();

                    if (fallback) {
                        this.logger.warn(
                            `Serving stale infotexts after upstream failure: ${getErrorMessage(error)}`,
                        );

                        return fallback;
                    }

                    this.logger.warn(
                        `Returning empty infotexts after upstream failure without fallback cache: ${getErrorMessage(error)}`,
                    );

                    return [];
                }
            },
            CACHE_TTL.infotexts,
        );
    }
}
