import { z } from "zod";

export const boundingBoxSchema = z.object({
    latitude: z.coerce.number().array().length(2),
    longitude: z.coerce.number().array().length(2),
});

export type BoundingBox = z.infer<typeof boundingBoxSchema>;
