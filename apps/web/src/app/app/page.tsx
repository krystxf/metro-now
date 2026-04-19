"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getStopPath } from "@/utils/app-paths";
import { graphqlClient } from "@/graphql/client";
import { SEARCH_STOPS, CLOSEST_STOPS } from "@/graphql/queries";
import { MagnifyingGlassIcon, HeartIcon } from "@heroicons/react/24/outline";
import { MapPinIcon, HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { useFavoriteStops } from "@/hooks/useFavoriteStops";
import { useRecentStops } from "@/hooks/useRecentStops";

type StopResult = {
    id: string;
    feed: string | null;
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

const getFeedFromStopId = (stopId: string): string | null => {
    if (stopId.startsWith("BRS:")) return "BRNO";
    if (stopId.startsWith("BTS:")) return "BRATISLAVA";
    if (stopId.startsWith("LBS:")) return "LIBEREC";
    if (stopId.startsWith("PMS:")) return "PMDP";
    if (stopId.startsWith("TLS:")) return "LEO";
    if (stopId.startsWith("ZRS:")) return "ZSR";
    if (!stopId.includes(":")) return "PID";
    return null;
};

const getCountryFromCoords = (lat: number, lon: number): string | null => {
    // Rough bounding boxes — good enough for Central Europe labels
    if (lat >= 47.7 && lat <= 49.6 && lon >= 16.8 && lon <= 22.6) return "🇸🇰 Slovakia";
    if (lat >= 45.7 && lat <= 49.0 && lon >= 9.5 && lon <= 17.2) return "🇦🇹 Austria";
    if (lat >= 47.3 && lat <= 55.0 && lon >= 5.9 && lon <= 15.0) return "🇩🇪 Germany";
    if (lat >= 49.0 && lat <= 54.9 && lon >= 14.1 && lon <= 24.2) return "🇵🇱 Poland";
    if (lat >= 45.7 && lat <= 48.6 && lon >= 16.1 && lon <= 22.9) return "🇭🇺 Hungary";
    return null;
};

const getLocationLabel = (
    feed: string | null,
    lat: number,
    lon: number,
): string | null => {
    // Czech Republic feeds — show city (no flag)
    switch (feed) {
        case "PID": return null;
        case "BRNO": return "Brno";
        case "LIBEREC": return "Liberec";
        case "PMDP": return "Plzeň";
        case "USTI": return "Ústí n.L.";
        case "BRATISLAVA": return "🇸🇰 Bratislava";
    }
    // For ZSR, LEO or unknown feeds — decide by coordinates
    return getCountryFromCoords(lat, lon);
};

type NearbyStop = StopResult & { distance: number };

const formatDistance = (meters: number): string => {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
};

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

const StopCard = ({
    stop,
    distance,
    isFavorite,
    onFavoriteToggle,
    onVisit,
}: {
    stop: StopResult;
    distance?: number;
    isFavorite?: boolean;
    onFavoriteToggle?: () => void;
    onVisit?: () => void;
}) => {
    const routes = sortRoutes(uniqueRoutes(stop));
    const feed = stop.feed ?? getFeedFromStopId(stop.id);
    const locationLabel = getLocationLabel(feed, stop.avgLatitude, stop.avgLongitude);

    return (
        <div className="relative group">
            <Link
                href={feed ? getStopPath(feed, stop.id) : "#"}
                onClick={onVisit}
                className="block p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors bg-white dark:bg-neutral-900"
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                            {stop.name}
                        </h3>
                        {locationLabel && (
                            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded px-1.5 py-0.5">
                                {locationLabel}
                            </span>
                        )}
                    </div>
                    {typeof distance === "number" && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap flex items-center gap-1 mr-7">
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
            {onFavoriteToggle && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        onFavoriteToggle();
                    }}
                    className="absolute top-3 right-3 p-1 text-neutral-400 hover:text-red-300 dark:hover:text-red-300 transition-colors"
                    aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                    {isFavorite
                        ? <HeartSolidIcon className="h-4 w-4 text-red-300" />
                        : <HeartIcon className="h-4 w-4" />
                    }
                </button>
            )}
        </div>
    );
};

type LocationState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "denied" }
    | { status: "error"; message: string }
    | { status: "loaded"; latitude: number; longitude: number };

export default function AppPage() {
    const { favorites, toggle, isFavorite } = useFavoriteStops();
    const { recent, add: addRecent } = useRecentStops();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<StopResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([]);
    const [stopDistances, setStopDistances] = useState<Map<string, number>>(new Map());
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
            const data = await graphqlClient.request<{ searchStops: StopResult[] }>(
                SEARCH_STOPS,
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
            const data = await graphqlClient.request<{
                closestStops: { distance: number; stop: StopResult }[];
            }>(CLOSEST_STOPS, { latitude: lat, longitude: lon, limit: 7 });
            const distances = new Map<string, number>();
            const withDistance = data.closestStops.map(({ distance, stop }) => {
                distances.set(stop.id, distance);
                return { ...stop, distance };
            });
            setStopDistances(distances);
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

        setLocationState({ status: "loading" });
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                console.log("User location:", { latitude, longitude });
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

    const sortedFavorites = useMemo(() => {
        if (stopDistances.size === 0) return favorites;
        return [...favorites].sort((a, b) => {
            const distA = stopDistances.get(a.id) ?? Number.POSITIVE_INFINITY;
            const distB = stopDistances.get(b.id) ?? Number.POSITIVE_INFINITY;
            return distA - distB;
        });
    }, [favorites, stopDistances]);

    const showSearchResults = searchQuery.trim().length > 0;

    return (
        <main className="max-w-screen-sm mx-auto px-4 mt-24 pb-12 text-black dark:text-white">
            <h1 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 uppercase tracking-wide mb-6">Departures</h1>

            <div className="relative mb-8">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <input
                    type="text"
                    placeholder="Search stops..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:placeholder-transparent focus:outline-none focus:ring-2 focus:ring-white focus:shadow-[0_0_6px_rgba(255,255,255,0.1)] focus:border-transparent transition-shadow duration-500 ease-in-out"
                />
            </div>

            {!showSearchResults && sortedFavorites.length > 0 && (
                <section className="mb-8">
                    <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 uppercase tracking-wide mb-3">
                        Favorites
                    </h2>
                    <div className="flex flex-col gap-2">
                        {sortedFavorites.map((fav) => {
                            const distance = stopDistances.get(fav.id);
                            return (
                                <div key={fav.id} className="relative group">
                                    <Link
                                        href={fav.feed ? getStopPath(fav.feed, fav.id) : "#"}
                                        onClick={() => addRecent(fav)}
                                        className="block p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors bg-white dark:bg-neutral-900"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-medium text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">
                                                {fav.name}
                                            </h3>
                                            {typeof distance === "number" && (
                                                <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap flex items-center gap-1">
                                                    <MapPinIcon className="h-3 w-3" />
                                                    {formatDistance(distance)}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => toggle(fav)}
                                        className="absolute top-3 right-3 p-1 text-neutral-400 hover:text-red-300 dark:hover:text-red-300 transition-colors"
                                        aria-label="Remove from favorites"
                                    >
                                        <HeartSolidIcon className="h-4 w-4 text-red-300" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {!showSearchResults && recent.filter((r) => !favorites.some((f) => f.id === r.id)).length > 0 && (
                <section className="mb-8">
                    <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 uppercase tracking-wide mb-3">
                        Recent searches
                    </h2>
                    <div className="flex flex-col gap-2">
                        {recent
                            .filter((r) => !favorites.some((f) => f.id === r.id))
                            .map((r) => (
                                <Link
                                    key={r.id}
                                    href={r.feed ? getStopPath(r.feed, r.id) : "#"}
                                    onClick={() => addRecent(r)}
                                    className="group block p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors bg-white dark:bg-neutral-900"
                                >
                                    <h3 className="font-medium text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">
                                        {r.name}
                                    </h3>
                                </Link>
                            ))}
                    </div>
                </section>
            )}

            {showSearchResults ? (
                <section>
                    {(() => {
                        const q = searchQuery.trim().toLowerCase();
                        const matchingFavs = favorites.filter((f) =>
                            f.name.toLowerCase().includes(q),
                        );
                        const favIds = new Set(matchingFavs.map((f) => f.id));
                        const serverResultsById = new Map(searchResults.map((s) => [s.id, s]));
                        const favResults = matchingFavs
                            .map((fav) => serverResultsById.get(fav.id))
                            .filter((s): s is StopResult => s !== undefined);
                        const remainingResults = searchResults.filter((s) => !favIds.has(s.id));
                        const favsWithoutServerData = matchingFavs.filter(
                            (fav) => !serverResultsById.has(fav.id),
                        );

                        return (
                            <>
                                {favResults.length > 0 && (
                                    <div className="flex flex-col gap-2 mb-2">
                                        {favResults.map((stop) => (
                                            <StopCard
                                                key={stop.id}
                                                stop={stop}
                                                isFavorite={true}
                                                onFavoriteToggle={() => toggle({ id: stop.id, name: stop.name, feed: stop.feed ?? getFeedFromStopId(stop.id) ?? "" })}
                                                onVisit={() => addRecent({ id: stop.id, name: stop.name, feed: stop.feed ?? getFeedFromStopId(stop.id) ?? "" })}
                                            />
                                        ))}
                                    </div>
                                )}

                                {favsWithoutServerData.length > 0 && (
                                    <div className="flex flex-col gap-2 mb-2">
                                        {favsWithoutServerData.map((fav) => (
                                            <div key={fav.id} className="relative group">
                                                <Link
                                                    href={fav.feed ? getStopPath(fav.feed, fav.id) : "#"}
                                                    onClick={() => addRecent(fav)}
                                                    className="block p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors bg-white dark:bg-neutral-900"
                                                >
                                                    <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                                                        {fav.name}
                                                    </h3>
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => toggle(fav)}
                                                    className="absolute top-3 right-3 p-1 transition-colors"
                                                    aria-label="Remove from favorites"
                                                >
                                                    <HeartSolidIcon className="h-4 w-4 text-red-300" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {isSearching ? (
                                    <p className="text-neutral-500 dark:text-neutral-400 text-sm py-4 text-center">
                                        Searching...
                                    </p>
                                ) : remainingResults.length === 0 && matchingFavs.length === 0 ? (
                                    <p className="text-neutral-500 dark:text-neutral-400 text-sm py-4 text-center">
                                        No stops found
                                    </p>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {remainingResults.map((stop) => (
                                            <StopCard
                                                key={stop.id}
                                                stop={stop}
                                                isFavorite={isFavorite(stop.id)}
                                                onFavoriteToggle={() => toggle({ id: stop.id, name: stop.name, feed: stop.feed ?? getFeedFromStopId(stop.id) ?? "" })}
                                                onVisit={() => addRecent({ id: stop.id, name: stop.name, feed: stop.feed ?? getFeedFromStopId(stop.id) ?? "" })}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </section>
            ) : (
                <section>
                    <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 uppercase tracking-wide mb-3">
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
                            <button
                                type="button"
                                onClick={requestLocation}
                                className="text-white text-sm font-medium hover:underline mb-3"
                            >
                                Try again
                            </button>
                            <p className="text-neutral-400 dark:text-neutral-500 text-xs">
                                If blocked, reset location permission in your browser (lock icon in URL bar) and reload
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
                                className="text-white text-sm font-medium hover:underline"
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
                                <StopCard
                                    key={stop.id}
                                    stop={stop}
                                    distance={stop.distance}
                                    isFavorite={isFavorite(stop.id)}
                                    onFavoriteToggle={() => toggle({ id: stop.id, name: stop.name, feed: stop.feed ?? getFeedFromStopId(stop.id) ?? "" })}
                                    onVisit={() => addRecent({ id: stop.id, name: stop.name, feed: stop.feed ?? getFeedFromStopId(stop.id) ?? "" })}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}
        </main>
    );
}
