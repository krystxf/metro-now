"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { RouteStopList } from "../../../route/[id]/RouteStopList";

export const RouteModal = ({
    routeId,
    feedId,
}: {
    routeId: string;
    feedId?: string;
}) => {
    const router = useRouter();

    const close = useCallback(() => {
        router.back();
    }, [router]);

    return (
        <Dialog
            open
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    close();
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogTitle className="sr-only">Route stops</DialogTitle>
                <DialogDescription className="sr-only">
                    Shows the full stop list for the selected line.
                </DialogDescription>
                <RouteStopList routeId={routeId} feedId={feedId} />
            </DialogContent>
        </Dialog>
    );
};
