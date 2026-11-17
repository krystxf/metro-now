import { Schema } from "effect";

const METRO_LINES = ["A", "B", "C"] as const;

export const metroLine = Schema.Literal(...METRO_LINES);
