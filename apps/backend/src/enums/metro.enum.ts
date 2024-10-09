import { z } from "zod";

const METRO_LINES = ["A", "B", "C"] as const;

export const metroLine = z.enum(METRO_LINES);
