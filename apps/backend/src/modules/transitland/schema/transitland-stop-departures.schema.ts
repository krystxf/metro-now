import { z } from "zod";

export const transitlandStopDeparturesSchema = z.object({
    stops: z.array(
        z.object({
            stop_id: z.string(),
            stop_name: z.string(),
            platform_code: z.string().nullable(),
            departures: z.array(
                z.object({
                    date: z.string(),
                    service_date: z.string(),
                    departure_time: z.string(),
                    stop_sequence: z.number(),
                    schedule_relationship: z.string(),
                    departure: z.object({
                        scheduled_local: z.string().nullable(),
                        scheduled_utc: z.string().nullable(),
                        estimated_local: z.string().nullable(),
                        estimated_utc: z.string().nullable(),
                    }),
                    trip: z.object({
                        id: z.coerce.string(),
                        direction_id: z.number().nullable(),
                        trip_headsign: z.string().nullable(),
                        trip_id: z.string().nullable(),
                        trip_short_name: z.string().nullable(),
                        route: z.object({
                            route_id: z.string().nullable(),
                            route_short_name: z.string(),
                            route_long_name: z.string().nullable(),
                            route_type: z.number(),
                        }),
                    }),
                }),
            ),
        }),
    ),
});

export type TransitlandStopDeparturesSchema = z.infer<
    typeof transitlandStopDeparturesSchema
>;
