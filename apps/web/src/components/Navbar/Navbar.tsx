"use client";

import { useEffect, useState } from "react";
import { SOURCE_CODE_URL } from "@/constants/api";
import { twMerge } from "@/utils/tw-merge.utils";
import { NavbarDownloadLink } from "@/components/Navbar/NavbarDownloadLink";
import { navbarTransitionClassname } from "@/components/Navbar/navbar.utils";
import { NavbarAppLogo } from "@/components/Navbar/NavbarAppLogo";
import { NavbarLink } from "@/components/Navbar/NavbarLink";

type Props = {
    variant: "solid" | "transparent";
};

export const Navbar = (props: Props) => {
    const { variant = "solid" } = props;

    const [scrollY, setScrollY] = useState<number>(0);

    const isScrolledDown = scrollY > 10;

    useEffect(() => {
        if (!window) return;

        const onScrollChange = () => {
            setScrollY(window.scrollY);
        };

        window.addEventListener("scroll", onScrollChange);

        return () => {
            window.removeEventListener("scroll", onScrollChange);
        };
    }, []);

    return (
        <>
            <div
                className={twMerge(
                    "w-full flex justify-center sticky z-50 top-8",
                    navbarTransitionClassname,
                    scrollY ? "px-6" : "px-0",
                )}
            >
                <nav
                    className={twMerge(
                        "w-full rounded-full px-4 py-2 h-12 flex items-center justify-between bg-white dark:bg-black/20 backdrop-blur-lg text-black dark:text-white text-sm border",
                        navbarTransitionClassname,
                        isScrolledDown
                            ? "max-w-screen-sm border-neutral-100 dark:border-neutral-400/20 shadow-md"
                            : "max-w-screen-lg border-transparent",
                    )}
                >
                    <NavbarAppLogo expanded={!isScrolledDown} />

                    <div className="gap-12 sm:flex hidden">
                        <NavbarLink href={"/"}>About</NavbarLink>

                        <NavbarLink href={"/map"}>Map</NavbarLink>

                        <NavbarLink href={SOURCE_CODE_URL} target="_blank">
                            Source Code
                        </NavbarLink>
                    </div>

                    <NavbarDownloadLink />
                </nav>
            </div>
        </>
    );
};
