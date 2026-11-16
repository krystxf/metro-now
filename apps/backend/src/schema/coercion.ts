import { Schema } from "effect";

// Keep the established HTTP/upstream coercions, including Number(null) and
// String(undefined), rather than accepting only string-encoded values.
export const coerceNumber = Schema.transform(
    Schema.Unknown,
    Schema.Number.pipe(Schema.nonNaN()),
    {
        strict: false,
        decode: Number,
        encode: (value) => value,
    },
);
export const coerceString = Schema.transform(Schema.Unknown, Schema.String, {
    strict: false,
    decode: String,
    encode: (value) => value,
});
export const coerceDate = Schema.transform(
    Schema.Unknown,
    Schema.DateFromSelf,
    {
        strict: false,
        decode: (value) => new Date(value as string),
        encode: (value) => value,
    },
).pipe(Schema.validDate());
