import { getTitle } from "@/utils/metadata.utils";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: getTitle("Map"),
    description: "Metro Now area coverage",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return children;
}
