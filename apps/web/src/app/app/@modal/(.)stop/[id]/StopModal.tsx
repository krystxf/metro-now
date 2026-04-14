"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { DepartureBoard } from "../../../stop/[id]/DepartureBoard";

export const StopModal = ({
    stopId,
    stopName,
}: {
    stopId: string;
    stopName: string;
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
                <DialogTitle className="mb-4 pr-10 text-2xl">{stopName}</DialogTitle>
                <DialogDescription className="sr-only">
                    Shows live departures for the selected stop.
                </DialogDescription>
                <DepartureBoard stopId={stopId} />
            </DialogContent>
        </Dialog>
    );
};
