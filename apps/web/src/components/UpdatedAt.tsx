"use client";

import { useEffect, useState } from "react";

const formatRelativeTime = (date: Date): string => {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs <= 5) return "just now";
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
};

export const UpdatedAt = ({ date }: { date: Date }) => {
    const [label, setLabel] = useState(() => formatRelativeTime(date));

    useEffect(() => {
        setLabel(formatRelativeTime(date));
        const interval = setInterval(() => setLabel(formatRelativeTime(date)), 1000);
        return () => clearInterval(interval);
    }, [date]);

    return (
        <p className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded-full px-2.5 py-1 mb-3">
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Updated {label}
        </p>
    );
};
