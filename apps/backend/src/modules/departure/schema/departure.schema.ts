import { Schema } from "effect";

import { timestampSchema } from "src/schema/timestamp.schema";

export const departureSchema = Schema.mutable(
    Schema.Struct({
        id: Schema.optionalWith(Schema.NullOr(Schema.String), {}),
        departure: timestampSchema,
        delay: Schema.Number.pipe(Schema.nonNaN()),
        headsign: Schema.String,
        route: Schema.String,
        routeId: Schema.optionalWith(Schema.NullOr(Schema.String), {}),
        platformCode: Schema.NullOr(Schema.String),
        platformId: Schema.String,
        isRealtime: Schema.Boolean,
    }),
);

export type DepartureSchema = Schema.Schema.Type<typeof departureSchema>;
