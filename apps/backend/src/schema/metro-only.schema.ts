import { Schema } from "effect";

export const metroOnlySchema = Schema.compose(
    Schema.transform(Schema.Unknown, Schema.Unknown, {
        strict: false,
        decode: (value) => value === "true",
        encode: (value) => value,
    }),
    Schema.Boolean,
);

export const vehicleTypeSchema = Schema.Literal(...["metro", "all"]);

export type VehicleTypeSchema = Schema.Schema.Type<typeof vehicleTypeSchema>;
