import path from "node:path";
import { fileURLToPath } from "node:url";
import nextra from "nextra";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    outputFileTracingRoot: path.join(__dirname, "../.."),
    pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
    images: {
        formats: ["image/avif", "image/webp"],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },
    async redirects() {
        return [
            {
                source: "/docs",
                destination: "/",
                permanent: true,
            },
            {
                source: "/docs/privacy-policy",
                destination: "/privacy-policy",
                permanent: true,
            },
            {
                source: "/docs/terms-and-conditions",
                destination: "/terms-and-conditions",
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
