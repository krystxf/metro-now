import { z } from "zod";

export const platformWithDistanceSchema = z.object({
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

export type PlatformWithDistanceSchema = z.infer<
    typeof platformWithDistanceSchema
>;
