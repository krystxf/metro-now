import type { Metadata } from "next";
import "@/styles/globals.css";
import { poppins } from "@/fonts";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getTitle } from "@/utils/metadata.utils";

const WEB_URL = new URL("https://metronow.dev");

const appleAppLink = {
    app_name: "metro-now",
    app_store_id: "6504659402",
    url: "https://apps.apple.com/cz/app/metro-now/id6504659402",
} as const;

export const metadata: Metadata = {
    title: getTitle(),
    description: "Prague public transport app",
    category: "Public transport",
    keywords: ["prague", "praha", "public transport", "metro", "tram", "bus"],
    metadataBase: WEB_URL,
    openGraph: {
        url: WEB_URL,
        type: "website",
    },
    appLinks: {
        ios: {
            ...appleAppLink,
            url: `${appleAppLink.url}?platform=iphone`,
        },
        iphone: {
            ...appleAppLink,
            url: `${appleAppLink.url}?platform=iphone`,
        },
        ipad: {
            ...appleAppLink,
            url: `${appleAppLink.url}?platform=ipad`,
        },
        web: {
            url: WEB_URL,
        },
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <link
                    href="https://api.mapbox.com/mapbox-gl-js/v2.6.1/mapbox-gl.css"
                    rel="stylesheet"
                />
            </head>

            <body className={poppins.className}>
                <div className="dark:bg-black">
                    <Navbar variant="transparent" />

                    {children}

                    <Footer />
                </div>
            </body>
        </html>
    );
}
