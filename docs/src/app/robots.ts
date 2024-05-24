import { HOMEPAGE } from "@/utils/const";
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
