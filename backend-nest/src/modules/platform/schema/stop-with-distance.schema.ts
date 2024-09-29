import { z } from "zod";

export const stopWithDistanceSchema = z.object({
    id: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    name: z.string(),
    routes: z
        .object({
            id: z.string(),
            name: z.string(),
        })
        .array(),
    distance: z.number().nonnegative(),
});

export type StopWithDistanceSchema = z.infer<typeof stopWithDistanceSchema>;
