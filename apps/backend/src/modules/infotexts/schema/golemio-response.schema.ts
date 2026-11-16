import { Schema } from "effect";

import { InfotextPriority } from "src/types/graphql.generated";

export const golemioResponseSchema = Schema.mutable(
    Schema.Array(
        Schema.mutable(
            Schema.Struct({
                valid_from: Schema.NullOr(Schema.String),
                valid_to: Schema.NullOr(Schema.String),
                text: Schema.String,
                text_en: Schema.NullOr(Schema.String),
                display_type: Schema.String,
                priority: Schema.compose(
                    Schema.transform(
                        Schema.Literal(...["low", "normal", "high"]),
                        Schema.String,
                        {
                            strict: false,
                            decode: (val) => val.toUpperCase(),
                            encode: (value) => value.toLowerCase(),
                        },
                    ),
                    Schema.Enums(InfotextPriority),
                ),
                related_stops: Schema.mutable(
                    Schema.Array(
                        Schema.mutable(
                            Schema.Struct({
                                id: Schema.String,
                                name: Schema.String,
                                platform_code: Schema.NullOr(Schema.String),
                            }),
                        ),
                    ),
                ),
                id: Schema.String,
            }),
        ),
    ),
);
