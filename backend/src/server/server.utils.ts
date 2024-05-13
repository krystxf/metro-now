import type { Departure } from "../types";
import type { ApiResponse } from "../schemas";

export const getParsedDeparture = (
  departure: ApiResponse["departures"][0],
): Departure => {
  const parsedDeparture = {
    route: {
      line: departure.route.short_name,
    },
    arrival: {
      predicted: departure.arrival_timestamp.predicted,
      scheduled: departure.arrival_timestamp.scheduled,
    },
    departure: {
      predicted: departure.departure_timestamp.predicted,
      scheduled: departure.departure_timestamp.scheduled,
    },
    delay: {
      isAvailable: departure.delay.is_available,
      minutes: departure.delay.minutes,
      seconds: departure.delay.seconds,
    },
    trip: {
      id: departure.trip.id,
      headsign: departure.trip.headsign,
      isAtStop: departure.trip.is_at_stop,
      isCanceled: departure.trip.is_canceled,
    },
  };

  return parsedDeparture;
};
