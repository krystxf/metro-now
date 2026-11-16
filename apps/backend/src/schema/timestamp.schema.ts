import { Schema } from "effect";
import { coerceString } from "src/schema/coercion";

export const timestampSchema = Schema.mutable(
    Schema.Struct({ predicted: coerceString, scheduled: coerceString }),
);

export type TimestampSchema = Schema.Schema.Type<typeof timestampSchema>;
