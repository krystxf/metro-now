export const getStopPath = (feedId: string, stopId: string): string =>
    `/app/stop/${encodeURIComponent(feedId)}/${encodeURIComponent(stopId)}`;

export const getRoutePath = (feedId: string, routeId: string): string =>
    `/app/route/${encodeURIComponent(feedId)}/${encodeURIComponent(routeId)}`;
