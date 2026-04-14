"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GRAPHQL_URL } from "@/constants/api";
import { ClockIcon } from "@heroicons/react/24/outline";

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
        name: string | null;
        color: string | null;
        vehicleType: string;
    } | null;
};

type DepartureGroup = {
    key: string;
    departures: Departure[];
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

const DepartureGroupRow = ({ group }: { group: DepartureGroup }) => {
    const first = group.departures[0];
    const rest = group.departures.slice(1);
    const routeColor = first.route?.color ? `#${first.route.color}` : "#6b7280";
    const routeIsLight = isLightColor(routeColor);
    const timeStr = formatDepartureTime(first.departureTime.predicted);
    const delayStr = first.delay ? formatDelay(first.delay) : "";

    return (
        <div className="py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0">
            <div className="flex items-center gap-3">
                <Link
                    href={`/app/route/${encodeURIComponent(first.route?.id ?? "")}`}
                    className="inline-flex items-center justify-center px-2 py-1 rounded font-bold text-sm min-w-[44px] text-center hover:opacity-80 transition-opacity"
                    style={{
                        backgroundColor: routeColor,
                        color: routeIsLight ? "#000" : "#fff",
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {first.route?.name ?? "?"}
                </Link>

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

            {rest.length > 0 && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 ml-[56px]">
                    also in{" "}
                    {rest.map((dep, i) => (
                        <span key={dep.id ?? `next-${i}`}>
                            {i > 0 && ", "}
                            {formatDepartureTime(dep.departureTime.predicted)}
                        </span>
                    ))}
                </p>
            )}
        </div>
    );
};

const REFRESH_INTERVAL_MS = 15_000;

const formatRelativeTime = (date: Date): string => {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
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
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const relativeTime = useRelativeTime(lastUpdated);

    const loadDepartures = useCallback(async () => {
        try {
            const res = await fetch(GRAPHQL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: `query GetDepartures($stopIds: [ID!]) {
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
                                name
                                color
                                vehicleType
                            }
                        }
                    }`,
                    variables: { stopIds: [stopId] },
                }),
            });
            const json = await res.json();
            setDepartures(json.data.departures);
            setLastUpdated(new Date());
        } catch {
            // Keep existing departures on refresh failure
        } finally {
            setIsLoading(false);
        }
    }, [stopId]);

    useEffect(() => {
        loadDepartures();
    }, [loadDepartures]);

    useEffect(() => {
        const interval = setInterval(loadDepartures, REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [loadDepartures]);

    if (isLoading) {
        return (
            <p className="text-neutral-500 dark:text-neutral-400 text-sm py-8 text-center">
                Loading departures...
            </p>
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
                        />
                    ))}
                </div>
            )}
        </>
    );
};
