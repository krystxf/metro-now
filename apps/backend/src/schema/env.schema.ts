import { commonServerEnvSchema } from "@metro-now/shared";
import { z } from "zod";

export const envSchema = commonServerEnvSchema.extend({
    GOLEMIO_API_KEY: z.string().min(1),
    TRANSIT_LAND_API_KEY: z.string().min(1).optional(),
});

export type EnvSchema = z.infer<typeof envSchema>;
