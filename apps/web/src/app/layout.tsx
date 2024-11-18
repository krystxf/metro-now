import type { Metadata } from "next";
import "./globals.css";
import { notoSans } from "./fonts";

export const metadata: Metadata = {
    title: "Metro Now",
    description: "Real-time metro departures in Prague",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={notoSans.className + ""}>{children}</body>
        </html>
    );
}
