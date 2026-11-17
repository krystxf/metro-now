import { Schema } from "effect";
import { coerceNumber } from "src/schema/coercion";

export const boundingBoxSchema = Schema.mutable(
    Schema.Struct({
        latitude: Schema.mutable(Schema.Array(coerceNumber)).pipe(
            Schema.itemsCount(2),
        ),
        longitude: Schema.mutable(Schema.Array(coerceNumber)).pipe(
            Schema.itemsCount(2),
        ),
    }),
);

export type BoundingBox = Schema.Schema.Type<typeof boundingBoxSchema>;
