import { z } from "zod";

import { timestampSchema } from "src/schema/timestamp.schema";

export const departureSchema = z.object({
    departure: timestampSchema,
    delay: z.number(),
    headsign: z.string(),
    route: z.string(),
    platformCode: z.string().nullable(),
    platformId: z.string(),
});

export type DepartureSchema = z.infer<typeof departureSchema>;
