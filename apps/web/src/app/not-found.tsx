import Link from "next/link";
import styles from "./not-found.module.css";
import Image from "next/image";
import MetroNowIcon from "../../public/metro-now-icon.png";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";

const LINKS = [
    {
        href: "/",
        text: "Main page",
    },
    {
        href: "/docs",
        text: "Documentation",
    },
];

const BackgroundText = () => {
    return (
        <>
            {" "}
            <div
                className={clsx(
                    "block dark:hidden",
                    styles.status_code,
                    styles.status_code_light,
                )}
            >
                404
            </div>
            <div
                className={clsx(
                    "hidden dark:block",
                    styles.status_code,
                    styles.status_code_dark,
                )}
            >
                404
            </div>
        </>
    );
};

const NotFoundPage = () => {
    return (
        <div className="flex dark:bg-black h-screen w-full flex-col items-center justify-center gap-6 px-4 dark:text-white overflow-hidden">
            <BackgroundText />

            <div className="space-y-2 text-center">
                <Link
                    href="/"
                    className="font-bold text-neutral-800 dark:text-neutral-50 text-5xl flex items-center gap-2"
                >
                    <Image
                        className="rounded-lg"
                        alt="Icon"
                        src={MetroNowIcon}
                        placeholder="blur"
                        height={48}
                        priority
                    />
                    Metro&nbsp;Now
                </Link>
                <p className="text-2xl font-medium text-left">
                    Oops, the page you were looking for cannot be found.
                </p>

                <ul className="flex flex-col gap-2 py-2 text-lg ">
                    {LINKS.map((link, index) => (
                        <li key={index}>
                            <Link
                                href={link.href}
                                className="flex gap-1 items-center text-neutral-500 dark:text-neutral-400 dark:hover:text-neutral-100 hover:text-neutral-950 transition-all"
                            >
                                <ChevronRightIcon className="h-3" />
                                {link.text}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default NotFoundPage;
