import { z } from "zod";

export const stopSchema = z.object({
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

export type StopSchema = z.infer<typeof stopSchema>;
