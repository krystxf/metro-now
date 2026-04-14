import { getTitle } from "@/utils/metadata.utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: getTitle("App"),
    description: "Search stops and view real-time departures",
};

export default function AppLayout({
    children,
    modal,
}: Readonly<{
    children: React.ReactNode;
    modal: React.ReactNode;
}>) {
    return (
        <>
            {children}
            {modal}
        </>
    );
}
