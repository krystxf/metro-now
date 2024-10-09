import { z } from "zod";

export const delaySchema = z.object({
    is_available: z.boolean(),
    minutes: z.number().nullable(),
    seconds: z.number().nullable(),
});

export type DelaySchema = z.infer<typeof delaySchema>;
