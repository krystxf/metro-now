import { z } from "zod";

export const timestampSchema = z.object({
    predicted: z.coerce.string(),
    scheduled: z.coerce.string(),
});

export type TimestampSchema = z.infer<typeof timestampSchema>;
