import React from "react";

const themeConfig = {
    logo: <strong>🚇 metro-now</strong>,
    docsRepositoryBase: "https://github.com/krystxf/metro-now/tree/main/docs",
    project: {
        link: "https://github.com/krystxf/metro-now",
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
