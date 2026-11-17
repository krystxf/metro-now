import { Schema } from "effect";

export const responseSchema = Schema.mutable(
    Schema.Array(
        Schema.mutable(
            Schema.Struct({
                id: Schema.String,
                text: Schema.String,
                textEn: Schema.NullOr(Schema.String),
                priority: Schema.Literal(...["LOW", "NORMAL", "HIGH"]),
                displayType: Schema.String,
                relatedStops: Schema.mutable(
                    Schema.Array(
                        Schema.mutable(
                            Schema.Struct({
                                id: Schema.String,
                                name: Schema.String,
                                platformCode: Schema.NullOr(Schema.String),
                            }),
                        ),
                    ),
                ),
                validFrom: Schema.NullOr(Schema.String),
                validTo: Schema.NullOr(Schema.String),
            }),
        ),
    ),
);
