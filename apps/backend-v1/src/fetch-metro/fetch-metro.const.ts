export const endpointUrl = new URL(
    "/v2/pid/departureboards",
    "https://api.golemio.cz",
);
export const headers = new Headers({
    "Content-Type": "application/json",
    "X-Access-Token": process.env.GOLEMIO_API_KEY!,
});
const params = new URLSearchParams({
    includeMetroTrains: String(true),
    preferredTimezone: "Europe_Prague",
    mode: "departures",
    order: "real",
    filter: "none",
    minutesBefore: String(1),
});

export const paramsAsArray = [...params.entries()];
