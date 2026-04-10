import { z } from "zod";

import { timestampSchema } from "src/schema/timestamp.schema";

export const departureSchema = z.object({
    id: z.string().nullable().optional(),
    departure: timestampSchema,
    delay: z.number(),
    headsign: z.string(),
    route: z.string(),
    routeId: z.string().nullable().optional(),
    platformCode: z.string().nullable(),
    platformId: z.string(),
    isRealtime: z.boolean(),
});

export type DepartureSchema = z.infer<typeof departureSchema>;
