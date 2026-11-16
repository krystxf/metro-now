import { Schema } from "effect";

export const platformWithDistanceSchema = Schema.mutable(
    Schema.Struct({
        id: Schema.String,
        latitude: Schema.Number.pipe(Schema.nonNaN()),
        longitude: Schema.Number.pipe(Schema.nonNaN()),
        name: Schema.String,
        routes: Schema.mutable(
            Schema.Array(
                Schema.mutable(
                    Schema.Struct({
                        id: Schema.String,
                        name: Schema.String,
                        color: Schema.optionalWith(
                            Schema.NullOr(Schema.String),
                            {},
                        ),
                    }),
                ),
            ),
        ),
        distance: Schema.Number.pipe(Schema.nonNaN()).pipe(
            Schema.nonNegative(),
        ),
    }),
);

export type PlatformWithDistanceSchema = Schema.Schema.Type<
    typeof platformWithDistanceSchema
>;
