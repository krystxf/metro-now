declare module "*.png" {
    const content: import("next/dist/client/image").StaticImageData;
    export default content;
}

declare module "*.svg" {
    const content: string;
    export default content;
}
