import { z } from "zod";
import { MetroLine } from "./types";
import { stopIDs } from "./data/stop-ids";

const stopIDSchema = z.enum(stopIDs);

export const StopIDsSchema = z.array(stopIDSchema).max(10);

export const SubscribeSchema = z.object({
  subscribe: StopIDsSchema,
});

const TimestampSchema = z.object({
  predicted: z.coerce.date(),
  scheduled: z.coerce.date(),
});

export const ApiResponseSchema = z.object({
  departures: z.array(
    z.object({
      arrival_timestamp: TimestampSchema,
      departure_timestamp: TimestampSchema,
      delay: z.object({
        is_available: z.boolean(),
        minutes: z.number().nullable(),
        seconds: z.number().nullable(),
      }),
      route: z.object({
        short_name: z.nativeEnum(MetroLine),
      }),
      stop: z.object({
        id: stopIDSchema,
      }),
      trip: z.object({
        headsign: z.string(),
        id: z.string(),
        is_at_stop: z.boolean(),
        is_canceled: z.boolean(),
      }),
    })
  ),
});

export type ApiResponse = z.infer<typeof ApiResponseSchema>;
