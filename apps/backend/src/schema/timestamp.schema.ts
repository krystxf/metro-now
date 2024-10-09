import { z } from "zod";

export const timestampSchema = z.object({
    predicted: z.coerce.date(),
    scheduled: z.coerce.date(),
});

export type TimestampSchema = z.infer<typeof timestampSchema>;
