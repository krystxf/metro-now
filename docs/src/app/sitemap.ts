import { HOMEPAGE } from "@/utils/const";
import type { MetadataRoute } from "next";

const pages = [
    "/",
    "/docs",
    "/docs/backend",
    "/docs/privacy-policy",
    "/docs/rest-api",
    "/docs/terms-and-conditions",
] as const satisfies string[];

type PriorityByPage = {
    [key in (typeof pages)[number]]?: number;
};

const priorityByPage: PriorityByPage = {
    "/": 1,
};

const sitemap = (): MetadataRoute.Sitemap => {
    return pages.map((url) => ({
        url: `${HOMEPAGE}${url}`,
        lastModified: new Date(),
        priority: priorityByPage[url] ?? 0.5,
    }));
};

export default sitemap;
