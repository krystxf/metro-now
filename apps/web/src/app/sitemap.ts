import { HOMEPAGE_URL } from "../constants/api";
import type { MetadataRoute } from "next";

const docsPaths = [
    "/docs",
    "/docs/backend",
    "/docs/privacy-policy",
    "/docs/rest-api",
    "/docs/terms-and-conditions",
] as const satisfies string[];

const sitemap = (): MetadataRoute.Sitemap => [
    {
        url: `${HOMEPAGE_URL}/`,
        lastModified: new Date(),
        priority: 1,
    },
    ...docsPaths.map((path) => ({
        url: `${HOMEPAGE_URL}${path}`,
        lastModified: new Date(),
        priority: 0.8,
    })),
];

export default sitemap;
