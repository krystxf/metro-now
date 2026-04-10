declare module "*.png" {
    const content: import("next/dist/client/image").StaticImageData;
    export default content;
}

declare module "*.svg" {
    const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
    export default content;
}
