"use client";

import { useCallback, useEffect, useState } from "react";

type RecentStop = {
    id: string;
    name: string;
    feed: string;
};

const STORAGE_KEY = "recent-stops";
const MAX_RECENT = 5;

const read = (): RecentStop[] => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
        return [];
    }
};

export const useRecentStops = () => {
    const [recent, setRecent] = useState<RecentStop[]>([]);

    useEffect(() => {
        setRecent(read());
    }, []);

    const add = useCallback((stop: RecentStop) => {
        setRecent((prev) => {
            const next = [stop, ...prev.filter((s) => s.id !== stop.id)].slice(
                0,
                MAX_RECENT,
            );
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const clear = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setRecent([]);
    }, []);

    return { recent, add, clear };
};
