import { unique } from "radash";

import { endpointUrl, headers, paramsAsArray } from "./fetch-metro.const";
import { ApiResponseSchema } from "../schemas";

export const fetchApiData = async (stopIDs: string[]) => {
  if (!stopIDs.length) {
    return { departures: [] };
  }

  const stopIDsParams = unique(stopIDs).map(
    (id) => ["ids[]", id] satisfies [string, string]
  );

  const searchParams = new URLSearchParams(paramsAsArray.concat(stopIDsParams));
  const url = new URL(`${endpointUrl}?${searchParams}`);
  const res = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch data from Golemio API: ${res.statusText}`);
  }

  const body = await res.json();
  const parsed = ApiResponseSchema.safeParse(body);

  if (!parsed.success) {
    console.error("Golemio API response:", body);
    throw new Error("Golemio API response is in unexpected format");
  }

  return parsed.data;
};
