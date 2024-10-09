import { GITHUB } from "@/const";
import React from "react";

const themeConfig = {
    logo: <strong>🚇 metro-now</strong>,
    docsRepositoryBase: `${GITHUB}/tree/main/docs`,
    project: {
        link: GITHUB,
    },
    editLink: {
        text: "Edit this page on GitHub →",
    },
    footer: {
        text: (
            <div className="flex w-full sm:items-start pt-6">
                <p className="text-xs">
                    © {new Date().getFullYear()} metro-now
                </p>
            </div>
        ),
    },
};

export default themeConfig;
