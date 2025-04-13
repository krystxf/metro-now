import { z } from "zod";

import { InfotextPriority } from "src/types/graphql.generated";

export const golemioResponseSchema = z
    .object({
        valid_from: z.string().nullable(),
        valid_to: z.string().nullable(),
        text: z.string(),
        text_en: z.string().nullable(),
        display_type: z.string(),
        priority: z
            .enum(["low", "normal", "high"])
            .transform((val) => val.toUpperCase())
            .pipe(z.nativeEnum(InfotextPriority)),
        related_stops: z.array(
            z.object({
                id: z.string(),
                name: z.string(),
                platform_code: z.string().nullable(),
            }),
        ),
        id: z.string(),
    })
    .array();
