"use client";

import { useCallback, useEffect, useState } from "react";

type FavoriteStop = {
    id: string;
    name: string;
    feed: string;
};

const STORAGE_KEY = "favorite-stops";

const read = (): FavoriteStop[] => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
        return [];
    }
};

export const useFavoriteStops = () => {
    const [favorites, setFavorites] = useState<FavoriteStop[]>([]);

    useEffect(() => {
        setFavorites(read());
    }, []);

    const toggle = useCallback((stop: FavoriteStop) => {
        setFavorites((prev) => {
            const next = prev.some((s) => s.id === stop.id)
                ? prev.filter((s) => s.id !== stop.id)
                : [...prev, stop];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const isFavorite = useCallback(
        (id: string) => favorites.some((s) => s.id === id),
        [favorites],
    );

    return { favorites, toggle, isFavorite };
};
