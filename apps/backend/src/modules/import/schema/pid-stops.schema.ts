import { z } from "zod";

export const pidStopsSchema = z.object({
    dataFormatVersion: z.literal("3"),
    stopGroups: z
        .object({
            name: z.string(),
            node: z.number(),
            avgLat: z.number(),
            avgLon: z.number(),
            stops: z
                .object({
                    lat: z.number(),
                    lon: z.number(),
                    gtfsIds: z.string().array(),
                    altIdosName: z.string(),
                    isMetro: z.boolean().optional(),
                    platform: z.string().optional().nullable(),
                    lines: z
                        .object({
                            id: z.coerce.string(),
                            name: z.string(),
                            type: z.string(),
                        })
                        .array(),
                })
                .array(),
        })
        .array(),
});

export type PidStopsSchema = z.infer<typeof pidStopsSchema>;
