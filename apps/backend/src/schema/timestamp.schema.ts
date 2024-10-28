import { z } from "zod";

export const timestampSchema = z.object({
    predicted: z.string(),
    scheduled: z.string(),
});

export type TimestampSchema = z.infer<typeof timestampSchema>;
