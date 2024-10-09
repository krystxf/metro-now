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
                    id: z.string(),
                    lat: z.number(),
                    lon: z.number(),
                })
                .array(),
        })
        .array(),
});

export type PidStopsSchema = z.infer<typeof pidStopsSchema>;
