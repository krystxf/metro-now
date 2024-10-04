import { z } from "zod";

export const platformSchema = z.object({
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
});

export type PlatformSchema = z.infer<typeof platformSchema>;
