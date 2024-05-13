import nextra from "nextra";

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Configure `pageExtensions` to include markdown and MDX files
    pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
    redirects: () => {
        return [
            {
                source: "/privacy-policy",
                destination: "/docs/legal/privacy-policy",
                permanent: true,
            },
            {
                source: "/terms-and-conditions",
                destination: "/docs/legal/terms-and-conditions",
                permanent: true,
            },
        ];
    },
};

const withNextra = nextra({
    theme: "nextra-theme-docs",
    themeConfig: "./theme.config.tsx",
});

// Merge MDX config with Next.js config
export default withNextra(nextConfig);
