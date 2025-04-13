import { z } from "zod";

export const responseSchema = z
    .object({
        id: z.string(),
        text: z.string(),
        textEn: z.string().nullable(),
        priority: z.enum(["LOW", "NORMAL", "HIGH"]),
        displayType: z.string(),
        relatedPlatforms: z.array(
            z.object({
                id: z.string(),
                platformCode: z.string().nullable(),
            }),
        ),
        validFrom: z.string().nullable(),
        validTo: z.string().nullable(),
    })
    .array();
