import { SOURCE_CODE_URL } from "./src/constants/api";

import React from "react";

const themeConfig = {
    logo: <strong>🚇 metro-now</strong>,
    docsRepositoryBase: `${SOURCE_CODE_URL}/tree/main/apps/web`,
    project: {
        link: SOURCE_CODE_URL,
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
