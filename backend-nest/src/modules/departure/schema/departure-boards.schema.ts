import { z } from "zod";
import { infoTextSchema } from "./info-text.schema";
import { timestampSchema } from "src/schema/timestamp.schema";
import { delaySchema } from "src/schema/delay.schema";

export const departureBoardsSchema = z.object({
    stops: z
        .object({
            platform_code: z.unknown(),
        })
        .array(),
    departures: z.array(
        z.object({
            delay: delaySchema,
            departure_timestamp: timestampSchema,
            arrival_timestamp: timestampSchema,
            trip: z.object({
                id: z.string(),
                headsign: z.string(),
                direction: z.string().nullable(),
            }),
            route: z.object({
                short_name: z.string(),
                is_night: z.boolean(),
                is_substitute_transport: z.boolean(),
            }),
            stop: z.object({
                id: z.string(),
                platform_code: z.string(),
            }),
        }),
    ),
    infotexts: infoTextSchema.array(),
});

export type DepartureBoardsSchema = z.infer<typeof departureBoardsSchema>;