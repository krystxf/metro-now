const LEO_STOP_PREFIX = "TLS:";
const LEO_PLATFORM_PREFIX = "TLP:";
const LEO_ROUTE_PREFIX = "LTL:";

export const toLeoStopId = (gtfsStopId: string): string =>
    `${LEO_STOP_PREFIX}${gtfsStopId}`;

export const toLeoPlatformId = (gtfsStopId: string): string =>
    `${LEO_PLATFORM_PREFIX}${gtfsStopId}`;

export const toLeoRouteId = (gtfsRouteId: string): string =>
    `${LEO_ROUTE_PREFIX}${gtfsRouteId}`;

export const isLeoStopId = (id: string): boolean => id.startsWith(LEO_STOP_PREFIX);

export const isLeoPlatformId = (id: string): boolean =>
    id.startsWith(LEO_PLATFORM_PREFIX);

export const isLeoRouteId = (id: string): boolean => id.startsWith(LEO_ROUTE_PREFIX);

export const fromLeoStopId = (id: string): string => id.slice(LEO_STOP_PREFIX.length);

export const fromLeoPlatformId = (id: string): string =>
    id.slice(LEO_PLATFORM_PREFIX.length);

export const fromLeoRouteId = (id: string): string =>
    id.slice(LEO_ROUTE_PREFIX.length);
