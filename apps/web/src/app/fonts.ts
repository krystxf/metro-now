import { Noto_Sans, Noto_Sans_Mono } from "next/font/google";

export const notoSans = Noto_Sans({
    display: "auto",
    preload: true,
    subsets: ["latin"],
});

export const notoSansMono = Noto_Sans_Mono({
    display: "auto",
    preload: true,
    subsets: ["latin"],
});
