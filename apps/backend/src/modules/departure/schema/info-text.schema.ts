import { z } from "zod";

export const infoTextSchema = z.object({
    valid_from: z.union([z.coerce.date(), z.null(), z.undefined()]),
    valid_to: z.union([z.coerce.date(), z.null(), z.undefined()]),
    text: z.string(),
    text_en: z.union([z.string(), z.null(), z.undefined()]),
    display_type: z.unknown(),
    related_stops: z.string().array(),
});

export type InfoTextSchema = z.infer<typeof infoTextSchema>;
