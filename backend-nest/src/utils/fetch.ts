export const GOLEMIO_ENDPOINT = new URL(
    "/v2/pid/departureboards",
    "https://api.golemio.cz",
);

export const getGolemioHeaders = () => {
    return new Headers({
        "Content-Type": "application/json",
        "X-Access-Token": process.env.GOLEMIO_API_KEY,
    });
};
