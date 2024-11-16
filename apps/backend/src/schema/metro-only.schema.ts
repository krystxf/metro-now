import { z } from "zod";

export const metroOnlySchema = z.preprocess(
    (value) => value === "true",
    z.boolean(),
);

export const vehicleTypeSchema = z.enum(["metro", "all"]);

export type VehicleTypeSchema = z.infer<typeof vehicleTypeSchema>;
