import { HOMEPAGE_URL } from "@metro-now/constants";
import type { MetadataRoute } from "next";

const robots = (): MetadataRoute.Robots => ({
    rules: {
        allow: "/",
        userAgent: "*",
    },
    sitemap: `${HOMEPAGE_URL}/sitemap.xml`,
});

export default robots;
