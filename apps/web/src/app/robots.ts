import type { MetadataRoute } from "next";
import { HOMEPAGE_URL } from "../constants/api";

const robots = (): MetadataRoute.Robots => ({
    rules: {
        allow: "/",
        userAgent: "*",
    },
    sitemap: `${HOMEPAGE_URL}/sitemap.xml`,
});

export default robots;
