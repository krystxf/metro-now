"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getStopPath } from "@/utils/app-paths";
import { graphqlFetch } from "@/utils/graphql-client";

type Platform = {
    id: string;
    name: string;
    stop: { id: string; name: string } | null;
};

type Direction = {
    id: string;
    platforms: Platform[];
};

type Route = {
    id: string;
    feed: string;
    name: string | null;
    color: string | null;
    vehicleType: string;
    directions: Direction[];
};

const isLightColor = (hex: string): boolean => {
    const c = hex.replace("#", "");
    const r = Number.parseInt(c.substring(0, 2), 16);
    const g = Number.parseInt(c.substring(2, 4), 16);
    const b = Number.parseInt(c.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
};

const dedupeStops = (platforms: Platform[]): { id: string | null; name: string }[] => {
    const seen = new Set<string>();
    const stops: { id: string | null; name: string }[] = [];
    for (const platform of platforms) {
        const name = platform.stop?.name ?? platform.name;
        if (seen.has(name)) continue;
        seen.add(name);
        stops.push({ id: platform.stop?.id ?? null, name });
    }
    return stops;
};

export const RouteStopList = ({
    routeId,
    feedId,
}: {
    routeId: string;
    feedId?: string;
}) => {
    const [route, setRoute] = useState<Route | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadRoute = useCallback(async () => {
        try {
            const data = await graphqlFetch<{ route: Route | null }>(
                `query GetRoute($id: ID!, $feed: Feed) {
                    route(id: $id, feed: $feed) {
                        id
                        feed
                        name
                        color
                        vehicleType
                        directions {
                            id
                            platforms {
                                id
                                name
                                stop { id name }
                            }
                        }
                    }
                }`,
                { id: routeId, feed: feedId },
            );

            setRoute(data.route ?? null);
        } catch {
            setRoute(null);
        } finally {
            setIsLoading(false);
        }
    }, [feedId, routeId]);

    useEffect(() => {
        loadRoute();
    }, [loadRoute]);

    if (isLoading) {
        return (
            <p className="text-neutral-500 dark:text-neutral-400 text-sm py-8 text-center">
                Loading route...
            </p>
        );
    }

    if (!route) {
        return (
            <p className="text-neutral-500 dark:text-neutral-400 text-sm py-8 text-center">
                Route not found
            </p>
        );
    }

    const routeColor = route.color ? `#${route.color}` : "#6b7280";
    const routeIsLight = isLightColor(routeColor);

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <span
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded font-bold text-lg min-w-[48px] text-center"
                    style={{
                        backgroundColor: routeColor,
                        color: routeIsLight ? "#000" : "#fff",
                    }}
                >
                    {route.name ?? "?"}
                </span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400 capitalize">
                    {route.vehicleType.toLowerCase()}
                </span>
            </div>

            {route.directions.map((direction, dirIndex) => {
                const stops = dedupeStops(direction.platforms);
                if (stops.length === 0) return null;

                return (
                    <div key={direction.id} className={dirIndex > 0 ? "mt-6" : ""}>
                        {route.directions.length > 1 && (
                            <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
                                {stops[0].name} → {stops[stops.length - 1].name}
                            </h3>
                        )}
                        <ol className="relative ml-3">
                            {stops.map((stop, i) => {
                                const isFirst = i === 0;
                                const isLast = i === stops.length - 1;

                                return (
                                    <li key={stop.id ?? stop.name} className="relative flex items-stretch">
                                        <div className="flex flex-col items-center mr-3">
                                            <div
                                                className="w-0.5 flex-1"
                                                style={{ backgroundColor: isFirst ? "transparent" : routeColor }}
                                            />
                                            <div
                                                className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                                                style={{
                                                    borderColor: routeColor,
                                                    backgroundColor: isFirst || isLast ? routeColor : "transparent",
                                                }}
                                            />
                                            <div
                                                className="w-0.5 flex-1"
                                                style={{ backgroundColor: isLast ? "transparent" : routeColor }}
                                            />
                                        </div>
                                        {stop.id ? (
                                            <Link
                                                href={getStopPath(route.feed, stop.id)}
                                                className="py-2 text-sm text-neutral-900 dark:text-neutral-100 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                            >
                                                {stop.name}
                                            </Link>
                                        ) : (
                                            <span className="py-2 text-sm text-neutral-900 dark:text-neutral-100">
                                                {stop.name}
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                );
            })}
        </div>
    );
};
