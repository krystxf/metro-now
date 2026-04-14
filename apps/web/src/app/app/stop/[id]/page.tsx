"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { GRAPHQL_URL } from "@/constants/api";
import { ArrowLeftIcon, ClockIcon } from "@heroicons/react/24/outline";

type Route = {
    name: string | null;
    color: string | null;
    vehicleType: string;
};

type Platform = {
    id: string;
    name: string;
    code: string | null;
    routes: Route[];
};

type Stop = {
    id: string;
    name: string;
    avgLatitude: number;
    avgLongitude: number;
    platforms: Platform[];
};

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
        name: string | null;
        color: string | null;
        vehicleType: string;
    } | null;
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

const DepartureRow = ({ departure }: { departure: Departure }) => {
    const routeColor = departure.route?.color ? `#${departure.route.color}` : "#6b7280";
    const routeIsLight = isLightColor(routeColor);
    const timeStr = formatDepartureTime(departure.departureTime.predicted);
    const delayStr = departure.delay ? formatDelay(departure.delay) : "";

    return (
        <div className="flex items-center gap-3 py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0">
            <span
                className="inline-flex items-center justify-center px-2 py-1 rounded font-bold text-sm min-w-[44px] text-center"
                style={{
                    backgroundColor: routeColor,
                    color: routeIsLight ? "#000" : "#fff",
                }}
            >
                {departure.route?.name ?? "?"}
            </span>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {departure.headsign ?? "Unknown destination"}
                </p>
                {departure.platformCode && (
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                        Platform {departure.platformCode}
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
                {departure.isRealtime && (
                    <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" title="Real-time" />
                )}
            </div>
        </div>
    );
};

const REFRESH_INTERVAL_MS = 15_000;

export default function StopDetailPage() {
    const params = useParams<{ id: string }>();
    const stopId = params?.id ?? "";

    const [stop, setStop] = useState<Stop | null>(null);
    const [departures, setDepartures] = useState<Departure[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const loadStop = useCallback(async () => {
        try {
            const data = await graphqlFetch<{ stop: Stop | null }>(
                `query GetStop($id: ID!) {
                    stop(id: $id) {
                        id
                        name
                        avgLatitude
                        avgLongitude
                        platforms {
                            id
                            name
                            code
                            routes {
                                name
                                color
                                vehicleType
                            }
                        }
                    }
                }`,
                { id: stopId },
            );
            setStop(data.stop);
            if (!data.stop) {
                setError("Stop not found");
            }
        } catch {
            setError("Failed to load stop");
        }
    }, [stopId]);

    const loadDepartures = useCallback(async () => {
        try {
            const data = await graphqlFetch<{ departures: Departure[] }>(
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
                            name
                            color
                            vehicleType
                        }
                    }
                }`,
                { stopIds: [stopId] },
            );
            setDepartures(data.departures);
            setLastUpdated(new Date());
        } catch {
            // Keep existing departures on refresh failure
        }
    }, [stopId]);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await loadStop();
            await loadDepartures();
            setIsLoading(false);
        };
        init();
    }, [loadStop, loadDepartures]);

    useEffect(() => {
        const interval = setInterval(loadDepartures, REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [loadDepartures]);

    if (isLoading) {
        return (
            <main className="max-w-screen-sm mx-auto px-4 mt-24 pb-12 text-black dark:text-white">
                <p className="text-neutral-500 dark:text-neutral-400 text-center py-12">
                    Loading...
                </p>
            </main>
        );
    }

    if (error || !stop) {
        return (
            <main className="max-w-screen-sm mx-auto px-4 mt-24 pb-12 text-black dark:text-white">
                <Link
                    href="/app"
                    className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 mb-6"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back
                </Link>
                <p className="text-neutral-500 dark:text-neutral-400 text-center py-12">
                    {error ?? "Stop not found"}
                </p>
            </main>
        );
    }

    return (
        <main className="max-w-screen-sm mx-auto px-4 mt-24 pb-12 text-black dark:text-white">
            <Link
                href="/app"
                className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 mb-6"
            >
                <ArrowLeftIcon className="h-4 w-4" />
                Back
            </Link>

            <h1 className="text-2xl font-bold mb-1">{stop.name}</h1>

            {lastUpdated && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1 mb-6">
                    <ClockIcon className="h-3 w-3" />
                    Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </p>
            )}

            {departures.length === 0 ? (
                <p className="text-neutral-500 dark:text-neutral-400 text-sm py-8 text-center">
                    No upcoming departures
                </p>
            ) : (
                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 px-4">
                    {departures.map((departure, i) => (
                        <DepartureRow
                            key={departure.id ?? `dep-${i}`}
                            departure={departure}
                        />
                    ))}
                </div>
            )}
        </main>
    );
}
