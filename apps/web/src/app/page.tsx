"use client";
import { Card } from "@/components/Card";
import Image from "next/image";

import Link from "next/link";
import {
    APPSTORE_URL,
    GRAPHQL_URL,
    SOURCE_CODE_URL,
    SWAGGER_URL,
} from "@metro-now/constants";
import DownloadOnAppStoreLight from "../../public/download-on-appstore-light.svg";
import MetroNowIcon from "../../public/metro-now-icon.png";
import MetroNowIphoneMockup from "../../public/iphone-mockup.png";
import MetroNowWatchMockup from "../../public/watch-mockup.png";

import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { AppearingText } from "@/components/AppearingText";

const LandingPage = () => {
    return (
        <div className="dark:bg-black px-12 xl:px-24 py-24">
            <main className="max-w-screen-lg m-auto">
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
                        Real-time public transport departures in minimalistic
                        app
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

                <div className="mb-32 mt-24 gap-4 grid text-center lg:mb-0 lg:w-full lg:max-w-7xl lg:grid-cols-3 lg:text-left text-slate-950 dark:text-white">
                    <Card className="group min-h-44">
                        <Link
                            href={SOURCE_CODE_URL}
                            className="h-full"
                            target="_blank"
                        >
                            <Card.Title>
                                Source code
                                <ArrowTopRightOnSquareIcon className="h-5" />
                            </Card.Title>

                            <Card.Content className="opacity-50">
                                Every line of code for this project is available
                                on GitHub.
                            </Card.Content>
                        </Link>
                    </Card>

                    <Card className="min-h-44">
                        <Link href="/docs" className="group">
                            <Card.Title>
                                API <Card.Arrow className="h-5" />
                            </Card.Title>
                        </Link>
                        <Card.Content>
                            <Card.Content.Link
                                href={SWAGGER_URL}
                                target="_blank"
                            >
                                REST API
                                <ArrowTopRightOnSquareIcon className="h-3" />
                            </Card.Content.Link>

                            <Card.Content.Link
                                href={GRAPHQL_URL}
                                target="_blank"
                            >
                                GrapQL
                                <ArrowTopRightOnSquareIcon className="h-3" />
                            </Card.Content.Link>
                        </Card.Content>
                    </Card>

                    <Card className="min-h-44">
                        <Card.Title>Legal</Card.Title>

                        <Card.Content>
                            <Card.Content.Link
                                href="/docs/privacy-policy"
                                target="_blank"
                            >
                                Privacy policy
                                <Card.Arrow />
                            </Card.Content.Link>

                            <Card.Content.Link
                                href="/docs/terms-and-conditions"
                                target="_blank"
                            >
                                Terms & conditions
                                <Card.Arrow />
                            </Card.Content.Link>
                        </Card.Content>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default LandingPage;
