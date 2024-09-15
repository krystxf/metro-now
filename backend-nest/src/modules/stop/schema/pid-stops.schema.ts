import { z } from "zod";

export const pidStopsSchema = z.object({
    type: z.literal("FeatureCollection"),
    name: z.string(),
    features: z
        .object({
            type: z.literal("Feature"),
            geometry: z.object({
                type: z.literal("Point"),
                coordinates: z.number().array().length(2),
            }),
            properties: z.object({
                OBJECTID: z.unknown(),
                stop_id: z.string(),
                stop_name: z.string(),
                wheelchair_boarding: z.string(),
                platform_code: z.unknown(),
                asw_node_id: z.string(),
                asw_stop_id: z.string(),
                routes_id: z.string(),
                routes_names: z.string(),
                is_night: z.string(),
                is_regional: z.string(),
                route_type: z.string(),
                zones_id: z.string(),
                on_request: z.unknown(),
                validity: z.string(),
            }),
        })
        .array(),
});

export type PidStopsSchema = z.infer<typeof pidStopsSchema>;
