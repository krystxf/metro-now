import Link from "next/link";
import styles from "./not-found.module.css";
import Image from "next/image";
import { MetroNowIcon } from "@/utils/image.utils";
import { ChevronRightIcon } from "@heroicons/react/24/solid";

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

const NotFoundPage = () => {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-6 px-4">
            <div className={styles.status_code}>404</div>

            <div className="space-y-2 text-center">
                <Link
                    href="/"
                    className="font-bold text-zinc-800 text-5xl flex items-center gap-2"
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
                                className="flex gap-1 items-center text-zinc-500 hover:text-zinc-950 transition-all"
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
