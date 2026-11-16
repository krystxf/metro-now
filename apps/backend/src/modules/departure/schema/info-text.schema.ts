import { Schema } from "effect";
import { coerceDate } from "src/schema/coercion";

export const infoTextSchema = Schema.mutable(
    Schema.Struct({
        valid_from: Schema.Union(coerceDate, Schema.Null, Schema.Undefined),
        valid_to: Schema.Union(coerceDate, Schema.Null, Schema.Undefined),
        text: Schema.String,
        text_en: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
        display_type: Schema.Unknown,
        related_stops: Schema.mutable(Schema.Array(Schema.String)),
    }),
);

export type InfoTextSchema = Schema.Schema.Type<typeof infoTextSchema>;
