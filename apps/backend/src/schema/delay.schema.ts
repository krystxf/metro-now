import { Schema } from "effect";

export const delaySchema = Schema.mutable(
    Schema.Struct({
        is_available: Schema.Boolean,
        minutes: Schema.NullOr(Schema.Number.pipe(Schema.nonNaN())),
        seconds: Schema.NullOr(Schema.Number.pipe(Schema.nonNaN())),
    }),
);

export type DelaySchema = Schema.Schema.Type<typeof delaySchema>;
