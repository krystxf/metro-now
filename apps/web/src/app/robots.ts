import { HOMEPAGE } from "@/const";
import type { MetadataRoute } from "next";

const robots = (): MetadataRoute.Robots => {
    return {
        rules: {
            allow: "/",
            userAgent: "*",
        },
        sitemap: `${HOMEPAGE}/sitemap.xml`,
    };
};

export default robots;
