import { Schema } from "effect";
import { coerceString } from "src/schema/coercion";

export const transitlandStopDeparturesSchema = Schema.mutable(
    Schema.Struct({
        stops: Schema.mutable(
            Schema.Array(
                Schema.mutable(
                    Schema.Struct({
                        stop_id: Schema.String,
                        stop_name: Schema.String,
                        platform_code: Schema.NullOr(Schema.String),
                        departures: Schema.mutable(
                            Schema.Array(
                                Schema.mutable(
                                    Schema.Struct({
                                        date: Schema.String,
                                        service_date: Schema.String,
                                        departure_time: Schema.String,
                                        stop_sequence: Schema.Number.pipe(
                                            Schema.nonNaN(),
                                        ),
                                        schedule_relationship: Schema.String,
                                        departure: Schema.mutable(
                                            Schema.Struct({
                                                scheduled_local: Schema.NullOr(
                                                    Schema.String,
                                                ),
                                                scheduled_utc: Schema.NullOr(
                                                    Schema.String,
                                                ),
                                                estimated_local: Schema.NullOr(
                                                    Schema.String,
                                                ),
                                                estimated_utc: Schema.NullOr(
                                                    Schema.String,
                                                ),
                                            }),
                                        ),
                                        trip: Schema.mutable(
                                            Schema.Struct({
                                                id: coerceString,
                                                direction_id: Schema.NullOr(
                                                    Schema.Number.pipe(
                                                        Schema.nonNaN(),
                                                    ),
                                                ),
                                                trip_headsign: Schema.NullOr(
                                                    Schema.String,
                                                ),
                                                trip_id: Schema.NullOr(
                                                    Schema.String,
                                                ),
                                                trip_short_name: Schema.NullOr(
                                                    Schema.String,
                                                ),
                                                route: Schema.mutable(
                                                    Schema.Struct({
                                                        route_id: Schema.NullOr(
                                                            Schema.String,
                                                        ),
                                                        route_short_name:
                                                            Schema.String,
                                                        route_long_name:
                                                            Schema.NullOr(
                                                                Schema.String,
                                                            ),
                                                        route_type:
                                                            Schema.Number.pipe(
                                                                Schema.nonNaN(),
                                                            ),
                                                    }),
                                                ),
                                            }),
                                        ),
                                    }),
                                ),
                            ),
                        ),
                    }),
                ),
            ),
        ),
    }),
);

export type TransitlandStopDeparturesSchema = Schema.Schema.Type<
    typeof transitlandStopDeparturesSchema
>;
