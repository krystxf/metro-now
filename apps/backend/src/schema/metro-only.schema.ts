import { z } from "zod";

export const metroOnlySchema = z.preprocess(
    (value) => value === "true",
    z.boolean(),
);
