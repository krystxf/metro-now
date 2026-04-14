"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { RouteStopList } from "../../../route/[id]/RouteStopList";

export const RouteModal = ({ routeId }: { routeId: string }) => {
    const router = useRouter();

    const close = useCallback(() => {
        router.back();
    }, [router]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [close]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
            onClick={close}
        >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

            <div
                className="relative bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={close}
                    className="absolute top-4 right-4 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                    <XMarkIcon className="h-5 w-5 text-neutral-500" />
                </button>

                <RouteStopList routeId={routeId} />
            </div>
        </div>
    );
};
