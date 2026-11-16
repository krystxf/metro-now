import { Schema } from "effect";

import { infoTextSchema } from "src/modules/departure/schema/info-text.schema";
import { delaySchema } from "src/schema/delay.schema";
import { timestampSchema } from "src/schema/timestamp.schema";

export const departureBoardsSchema = Schema.mutable(
    Schema.Struct({
        stops: Schema.mutable(
            Schema.Array(
                Schema.mutable(
                    Schema.Struct({ platform_code: Schema.Unknown }),
                ),
            ),
        ),
        departures: Schema.mutable(
            Schema.Array(
                Schema.mutable(
                    Schema.Struct({
                        delay: delaySchema,
                        departure_timestamp: timestampSchema,
                        arrival_timestamp: timestampSchema,
                        trip: Schema.mutable(
                            Schema.Struct({
                                id: Schema.String,
                                headsign: Schema.String,
                                direction: Schema.NullOr(Schema.String),
                            }),
                        ),
                        route: Schema.mutable(
                            Schema.Struct({
                                short_name: Schema.String,
                                is_night: Schema.Boolean,
                                is_substitute_transport: Schema.Boolean,
                            }),
                        ),
                        stop: Schema.mutable(
                            Schema.Struct({
                                id: Schema.String,
                                platform_code: Schema.NullOr(Schema.String),
                            }),
                        ),
                    }),
                ),
            ),
        ),
        infotexts: Schema.mutable(Schema.Array(infoTextSchema)),
    }),
);

export type DepartureBoardsSchema = Schema.Schema.Type<
    typeof departureBoardsSchema
>;
