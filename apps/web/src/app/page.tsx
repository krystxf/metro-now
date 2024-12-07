"use client";

import Image from "next/image";

import Link from "next/link";
import { APPSTORE_URL } from "../constants/api";
import DownloadOnAppStoreLight from "../../public/download-on-appstore-light.svg";
import MetroNowIcon from "../../public/metro-now-icon.png";
import MetroNowIphoneMockup from "../../public/iphone-mockup.png";
import MetroNowWatchMockup from "../../public/watch-mockup.png";
import { AppearingText } from "@/components/AppearingText";

export default function LandingPage() {
    return (
        <main className="max-w-screen-lg m-auto mt-24 pb-12 text-black dark:text-white">
            <div className="flex flex-col gap-2 items-center justify-center text-center">
                <h1 className="text-4xl xl:text-6xl font-bold text-zinc-800 flex gap-2 items-center dark:text-slate-50">
                    <Image
                        className="rounded-xl"
                        alt="Icon"
                        src={MetroNowIcon}
                        placeholder="blur"
                        height={56}
                        priority
                    />
                    Metro&nbsp;Now!
                </h1>
                <p className="text-slate-800 dark:text-slate-300">
                    Real-time public transport departures in minimalistic app
                </p>

                <Link href={APPSTORE_URL}>
                    <Image
                        src={DownloadOnAppStoreLight}
                        className="mt-4"
                        alt="Download on App Store"
                        height={50}
                        priority
                    />
                </Link>
            </div>
            <div className="flex flex-col gap-8 xl:flex-row items-center xl:items-start mt-24">
                <div className="xl:w-1/3 xl:mt-24">
                    <h2 className="font-semibold text-2xl dark:text-slate-200">
                        Available on iOS
                    </h2>
                    <p className="dark:text-slate-400">
                        <AppearingText text="Public transport departures from the nearest stop" />
                    </p>
                </div>
                <Image
                    src={MetroNowIphoneMockup}
                    className="xl:w-2/3 max-h-[75vh]"
                    style={{
                        objectFit: "scale-down",
                    }}
                    alt="Apple watch screenshots"
                    quality={90}
                    priority
                />
            </div>

            <div className="flex flex-col gap-8 xl:flex-row-reverse items-center xl:items-start mt-24">
                <div className="xl:w-1/2 xl:mt-24">
                    <h2 className="font-semibold text-2xl dark:text-slate-200">
                        Available on watchOS
                    </h2>
                    <p className="dark:text-slate-400">
                        <AppearingText text="Metro departures from the nearest stop on your wrist" />
                    </p>
                </div>
                <Image
                    src={MetroNowWatchMockup}
                    className="xl:w-1/2 max-h-[50vh]"
                    style={{
                        objectFit: "scale-down",
                    }}
                    alt="Apple watch screenshots"
                    quality={90}
                />
            </div>
        </main>
    );
}
