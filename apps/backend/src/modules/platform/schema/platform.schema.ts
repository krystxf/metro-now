import { z } from "zod";

export const platformSchema = z.object({
    id: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    name: z.string(),
    direction: z.string().nullable().optional(),
    routes: z
        .object({
            id: z.string(),
            name: z.string(),
            color: z.string().nullable().optional(),
        })
        .array(),
});

export type PlatformSchema = z.infer<typeof platformSchema>;
