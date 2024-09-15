import { timestampSchema } from "src/schema/timestamp.schema";
import { z } from "zod";

export const departureSchema = z.object({
    departure: timestampSchema,
    delay: z.number(),
    headsign: z.string(),
    route: z.string(),
    platformCode: z.string(),
    platformId: z.string(),
});

export type DepartureSchema = z.infer<typeof departureSchema>;
