"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { graphqlFetch } from "@/utils/graphql-client";
import { ClockIcon } from "@heroicons/react/24/outline";
import { RouteStopList } from "../../route/[id]/RouteStopList";
import { Skeleton } from "@/components/ui/skeleton";

type Departure = {
    id: string | null;
    headsign: string | null;
    delay: number | null;
    isRealtime: boolean;
    platformCode: string | null;
    departureTime: {
        predicted: string;
        scheduled: string;
    };
    route: {
        id: string;
        feed: string;
        name: string | null;
        color: string | null;
        vehicleType: string;
    } | null;
};

type DepartureGroup = {
    key: string;
    departures: Departure[];
};

type DepartureQueryData = {
    departures: Departure[];
};

type SelectedRoute = {
    id: string;
    feed: string;
    name: string | null;
};

const isLightColor = (hex: string): boolean => {
    const c = hex.replace("#", "");
    const r = Number.parseInt(c.substring(0, 2), 16);
    const g = Number.parseInt(c.substring(2, 4), 16);
    const b = Number.parseInt(c.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
};

const formatDepartureTime = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60000);

    if (diffMin <= 0) return "now";
    if (diffMin < 60) return `${diffMin} min`;

    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDelay = (delaySeconds: number): string => {
    const minutes = Math.round(delaySeconds / 60);
    if (minutes === 0) return "";
    return minutes > 0 ? `+${minutes}` : `${minutes}`;
};

const groupDepartures = (departures: Departure[]): DepartureGroup[] => {
    const groups: DepartureGroup[] = [];
    const groupMap = new Map<string, DepartureGroup>();

    for (const departure of departures) {
        const key = `${departure.route?.name ?? "?"}::${departure.headsign ?? ""}`;
        const existing = groupMap.get(key);
        if (existing) {
            existing.departures.push(departure);
        } else {
            const group = { key, departures: [departure] };
            groupMap.set(key, group);
            groups.push(group);
        }
    }

    return groups;
};

const sortDepartures = (departures: Departure[]): Departure[] =>
    [...departures].sort((a, b) => {
        const aTime = new Date(a.departureTime.predicted).getTime();
        const bTime = new Date(b.departureTime.predicted).getTime();

        if (aTime !== bTime) {
            return aTime - bTime;
        }

        return (a.route?.name ?? "").localeCompare(b.route?.name ?? "", undefined, {
            numeric: true,
        });
    });

const DepartureGroupRow = ({
    group,
    onRouteOpen,
}: {
    group: DepartureGroup;
    onRouteOpen: (route: SelectedRoute) => void;
}) => {
    const first = group.departures[0];
    const nextDeparture = group.departures[1];
    const route = first.route;
    const routeColor = first.route?.color ? `#${first.route.color}` : "#6b7280";
    const routeIsLight = isLightColor(routeColor);
    const timeStr = formatDepartureTime(first.departureTime.predicted);
    const delayStr = first.delay ? formatDelay(first.delay) : "";

    return (
        <div className="py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0">
            <div className="flex items-center gap-3">
                {route?.id ? (
                    <button
                        type="button"
                        className="inline-flex items-center justify-center px-2 py-1 rounded font-bold text-sm min-w-[44px] text-center hover:opacity-80 transition-opacity"
                        style={{
                            backgroundColor: routeColor,
                            color: routeIsLight ? "#000" : "#fff",
                        }}
                        onClick={() =>
                            onRouteOpen({
                                id: route.id,
                                feed: route.feed,
                                name: route.name,
                            })
                        }
                        aria-label={`Show stops for line ${route.name ?? "unknown"}`}
                    >
                        {route.name ?? "?"}
                    </button>
                ) : (
                    <span
                        className="inline-flex items-center justify-center px-2 py-1 rounded font-bold text-sm min-w-[44px] text-center"
                        style={{
                            backgroundColor: routeColor,
                            color: routeIsLight ? "#000" : "#fff",
                        }}
                    >
                        {first.route?.name ?? "?"}
                    </span>
                )}

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {first.headsign ?? "Unknown destination"}
                    </p>
                    {first.platformCode && (
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">
                            Platform {first.platformCode}
                        </p>
                    )}
                </div>

                <div className="text-right flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                        {timeStr}
                    </span>
                    {delayStr && (
                        <span className="text-xs text-red-500 font-medium tabular-nums">
                            {delayStr}
                        </span>
                    )}
                    {first.isRealtime && (
                        <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" title="Real-time" />
                    )}
                </div>
            </div>

            {nextDeparture && (
                <div className="mt-1 flex justify-end">
                    <p className="text-right text-xs text-neutral-400 dark:text-neutral-500">
                        also in {formatDepartureTime(nextDeparture.departureTime.predicted)}
                    </p>
                </div>
            )}
        </div>
    );
};

const REFRESH_INTERVAL_MS = 15_000;

const formatRelativeTime = (date: Date): string => {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs <= 0) return "just now";
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
};

const useRelativeTime = (date: Date | null): string => {
    const [label, setLabel] = useState(() => (date ? formatRelativeTime(date) : ""));

    useEffect(() => {
        if (!date) return;
        setLabel(formatRelativeTime(date));
        const interval = setInterval(() => setLabel(formatRelativeTime(date)), 1000);
        return () => clearInterval(interval);
    }, [date]);

    return label;
};

export const DepartureBoard = ({ stopId }: { stopId: string }) => {
    const [departures, setDepartures] = useState<Departure[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [selectedRoute, setSelectedRoute] = useState<SelectedRoute | null>(null);
    const relativeTime = useRelativeTime(lastUpdated);
    const hasLoadedDepartures = departures.length > 0;

    const loadDepartures = useCallback(async () => {
        try {
            const data = await graphqlFetch<DepartureQueryData>(
                `query GetDepartures($stopIds: [ID!]) {
                    departures(stopIds: $stopIds, limit: 30, minutesAfter: 120) {
                        id
                        headsign
                        delay
                        isRealtime
                        platformCode
                        departureTime {
                            predicted
                            scheduled
                        }
                        route {
                            id
                            feed
                            name
                            color
                            vehicleType
                        }
                    }
                }`,
                { stopIds: [stopId] },
            );

            setDepartures(sortDepartures(data.departures));
            setLastUpdated(new Date());
            setError(null);
        } catch {
            setError(
                hasLoadedDepartures
                    ? "Refresh failed. Showing the last loaded departures."
                    : "Could not load departures",
            );
        } finally {
            setIsLoading(false);
        }
    }, [hasLoadedDepartures, stopId]);

    useEffect(() => {
        loadDepartures();
    }, [loadDepartures]);

    useEffect(() => {
        const interval = setInterval(loadDepartures, REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [loadDepartures]);

    if (isLoading) {
        return (
            <>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1 mb-4">
                    <ClockIcon className="h-3 w-3" />
                    Updated just now
                </p>

                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 px-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                        <div key={i} className="py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0 flex items-center gap-3">
                            <Skeleton className="h-7 w-11 rounded" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-3.5 w-2/3" />
                                <Skeleton className="h-2.5 w-1/4" />
                            </div>
                            <Skeleton className="h-3.5 w-12" />
                        </div>
                    ))}
                </div>
            </>
        );
    }

    if (error && departures.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-3">{error}</p>
                <button
                    type="button"
                    onClick={loadDepartures}
                    className="text-brandOrange text-sm font-medium hover:underline"
                >
                    Try again
                </button>
            </div>
        );
    }

    return (
        <>
            {lastUpdated && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1 mb-4">
                    <ClockIcon className="h-3 w-3" />
                    Updated {relativeTime}
                </p>
            )}

            {error && departures.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">{error}</p>
            )}

            {departures.length === 0 ? (
                <p className="text-neutral-500 dark:text-neutral-400 text-sm py-8 text-center">
                    No upcoming departures
                </p>
            ) : (
                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 px-4">
                    {groupDepartures(departures).map((group) => (
                        <DepartureGroupRow
                            key={group.key}
                            group={group}
                            onRouteOpen={setSelectedRoute}
                        />
                    ))}
                </div>
            )}

            <Dialog
                open={selectedRoute !== null}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setSelectedRoute(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogTitle className="sr-only">
                        {selectedRoute?.name
                            ? `Line ${selectedRoute.name} stops`
                            : "Route stops"}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Shows the full stop list for the selected line.
                    </DialogDescription>
                    {selectedRoute ? (
                        <RouteStopList
                            routeId={selectedRoute.id}
                            feedId={selectedRoute.feed}
                        />
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    );
};
