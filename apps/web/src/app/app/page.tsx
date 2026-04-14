"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GRAPHQL_URL } from "@/constants/api";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { MapPinIcon } from "@heroicons/react/24/solid";

type StopResult = {
    id: string;
    name: string;
    avgLatitude: number;
    avgLongitude: number;
    platforms: {
        id: string;
        routes: {
            name: string | null;
            color: string | null;
            vehicleType: string;
        }[];
    }[];
};

type NearbyStop = StopResult & { distance: number };

const haversineDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): number => {
    const R = 6371e3;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (meters: number): string => {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
};

const graphqlFetch = async <T,>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    return json.data;
};

const STOP_FIELDS = `
    id
    name
    avgLatitude
    avgLongitude
    platforms {
        id
        routes {
            name
            color
            vehicleType
        }
    }
`;

const uniqueRoutes = (stop: StopResult) => {
    const seen = new Set<string>();
    const routes: { name: string; color: string | null; vehicleType: string }[] = [];
    for (const platform of stop.platforms) {
        for (const route of platform.routes) {
            if (!route.name || seen.has(route.name)) continue;
            seen.add(route.name);
            routes.push({ ...route, name: route.name });
        }
    }
    return routes;
};

const vehicleTypeOrder: Record<string, number> = {
    SUBWAY: 0,
    TRAIN: 1,
    TRAM: 2,
    BUS: 3,
    TROLLEYBUS: 4,
    FERRY: 5,
    FUNICULAR: 6,
};

const sortRoutes = (routes: { name: string; color: string | null; vehicleType: string }[]) =>
    [...routes].sort((a, b) => {
        const typeA = vehicleTypeOrder[a.vehicleType] ?? 99;
        const typeB = vehicleTypeOrder[b.vehicleType] ?? 99;
        if (typeA !== typeB) return typeA - typeB;
        return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

const RouteBadge = ({ route }: { route: { name: string; color: string | null; vehicleType: string } }) => {
    const bgColor = route.color ? `#${route.color}` : undefined;
    const isLight = bgColor ? isLightColor(bgColor) : false;

    return (
        <span
            className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-semibold min-w-[28px]"
            style={{
                backgroundColor: bgColor ?? "#6b7280",
                color: isLight ? "#000" : "#fff",
            }}
        >
            {route.name}
        </span>
    );
};

const isLightColor = (hex: string): boolean => {
    const c = hex.replace("#", "");
    const r = Number.parseInt(c.substring(0, 2), 16);
    const g = Number.parseInt(c.substring(2, 4), 16);
    const b = Number.parseInt(c.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
};

const StopCard = ({ stop, distance }: { stop: StopResult; distance?: number }) => {
    const routes = sortRoutes(uniqueRoutes(stop));

    return (
        <Link
            href={`/app/stop/${stop.id}`}
            className="block p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors bg-white dark:bg-neutral-900"
        >
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                    {stop.name}
                </h3>
                {typeof distance === "number" && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap flex items-center gap-1">
                        <MapPinIcon className="h-3 w-3" />
                        {formatDistance(distance)}
                    </span>
                )}
            </div>
            {routes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {routes.map((route) => (
                        <RouteBadge key={route.name} route={route} />
                    ))}
                </div>
            )}
        </Link>
    );
};

type LocationState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "denied" }
    | { status: "error"; message: string }
    | { status: "loaded"; latitude: number; longitude: number };

export default function AppPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<StopResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([]);
    const [locationState, setLocationState] = useState<LocationState>({ status: "idle" });
    const [isLoadingNearby, setIsLoadingNearby] = useState(false);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const searchStops = useCallback(async (query: string) => {
        if (query.trim().length === 0) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        try {
            const data = await graphqlFetch<{ searchStops: StopResult[] }>(
                `query SearchStops($query: String!) {
                    searchStops(query: $query, limit: 20) {
                        ${STOP_FIELDS}
                    }
                }`,
                { query: query.trim() },
            );
            setSearchResults(data.searchStops);
        } catch {
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            searchStops(value);
        }, 300);
    };

    const loadNearbyStops = useCallback(async (lat: number, lon: number) => {
        setIsLoadingNearby(true);
        try {
            const data = await graphqlFetch<{ stops: StopResult[] }>(
                `query AllStops {
                    stops(limit: 500) {
                        ${STOP_FIELDS}
                    }
                }`,
            );
            const withDistance = data.stops
                .map((stop) => ({
                    ...stop,
                    distance: haversineDistance(lat, lon, stop.avgLatitude, stop.avgLongitude),
                }))
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 15);
            setNearbyStops(withDistance);
        } catch {
            setNearbyStops([]);
        } finally {
            setIsLoadingNearby(false);
        }
    }, []);

    const requestLocation = useCallback(() => {
        if (typeof window === "undefined" || !navigator.geolocation) {
            setLocationState({ status: "error", message: "Geolocation is not supported" });
            return;
        }

        const isSecureContext = window.isSecureContext;
        if (!isSecureContext) {
            setLocationState({
                status: "error",
                message: "Location requires HTTPS. Use search instead.",
            });
            return;
        }

        setLocationState({ status: "loading" });
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocationState({ status: "loaded", latitude, longitude });
                loadNearbyStops(latitude, longitude);
            },
            (error) => {
                if (error.code === error.PERMISSION_DENIED) {
                    setLocationState({ status: "denied" });
                } else if (error.code === error.TIMEOUT) {
                    setLocationState({ status: "error", message: "Location request timed out" });
                } else {
                    setLocationState({ status: "error", message: "Could not get your location" });
                }
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
        );
    }, [loadNearbyStops]);

    useEffect(() => {
        requestLocation();
    }, [requestLocation]);

    const showSearchResults = searchQuery.trim().length > 0;

    return (
        <main className="max-w-screen-sm mx-auto px-4 mt-24 pb-12 text-black dark:text-white">
            <h1 className="text-2xl font-bold mb-6">Departures</h1>

            <div className="relative mb-8">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <input
                    type="text"
                    placeholder="Search stops..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brandOrange focus:border-transparent"
                />
            </div>

            {showSearchResults ? (
                <section>
                    <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
                        Search results
                    </h2>
                    {isSearching ? (
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm py-4 text-center">
                            Searching...
                        </p>
                    ) : searchResults.length === 0 ? (
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm py-4 text-center">
                            No stops found
                        </p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {searchResults.map((stop) => (
                                <StopCard key={stop.id} stop={stop} />
                            ))}
                        </div>
                    )}
                </section>
            ) : (
                <section>
                    <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
                        Nearby stops
                    </h2>

                    {locationState.status === "idle" || locationState.status === "loading" || isLoadingNearby ? (
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm py-4 text-center">
                            Finding nearby stops...
                        </p>
                    ) : locationState.status === "denied" ? (
                        <div className="text-center py-8">
                            <MapPinIcon className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
                            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-3">
                                Location access was denied
                            </p>
                            <p className="text-neutral-400 dark:text-neutral-500 text-xs">
                                Use the search bar above to find stops
                            </p>
                        </div>
                    ) : locationState.status === "error" ? (
                        <div className="text-center py-8">
                            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-2">
                                {locationState.message}
                            </p>
                            <button
                                type="button"
                                onClick={requestLocation}
                                className="text-brandOrange text-sm font-medium hover:underline"
                            >
                                Try again
                            </button>
                        </div>
                    ) : nearbyStops.length === 0 ? (
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm py-4 text-center">
                            No stops found nearby
                        </p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {nearbyStops.map((stop) => (
                                <StopCard key={stop.id} stop={stop} distance={stop.distance} />
                            ))}
                        </div>
                    )}
                </section>
            )}
        </main>
    );
}
