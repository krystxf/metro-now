import { Card } from "@/components/Card";
import Image from "next/image";

import Link from "next/link";
import {
    APPSTORE_URL,
    GRAPHQL_URL,
    SOURCE_CODE_URL,
    SWAGGER_URL,
} from "@metro-now/constants";
import {
    DownloadOnAppStoreLight,
    MetroNowIcon,
    MetroNowWatch,
} from "@/utils/image.utils";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

const LandingPage = () => {
    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <div className="flex flex-col gap-2 items-center justify-center text-center">
                <h1 className="text-6xl font-bold text-zinc-800 flex gap-2 items-center">
                    <Image
                        className="rounded-xl h-14 w-auto"
                        src={MetroNowIcon}
                        alt="Icon"
                    />
                    Metro&nbsp;Now!
                </h1>
                <p className="text-slate-800">
                    Get a real-time overview of metro departures from the
                    nearest stop in Prague
                </p>
                <Link href={APPSTORE_URL}>
                    <Image
                        src={DownloadOnAppStoreLight}
                        className="mt-4"
                        alt="Download on App Store"
                        height={50}
                    />
                </Link>
            </div>
            <Image
                src={MetroNowWatch}
                alt="Apple watch screenshots"
                height={1200}
                priority
            />

            <div className="mb-32 gap-4 grid text-center lg:mb-0 lg:w-full lg:max-w-7xl lg:grid-cols-3 lg:text-left">
                <Card className="group">
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
                            Every line of code for this project is available on
                            GitHub.
                        </Card.Content>
                    </Link>
                </Card>

                <Card>
                    <Link href="/docs" className="group">
                        <Card.Title>
                            Documentation <Card.Arrow className="h-5" />
                        </Card.Title>
                    </Link>
                    <Card.Content>
                        <Card.Content.Link href={SWAGGER_URL} target="_blank">
                            REST API
                            <ArrowTopRightOnSquareIcon className="h-3" />
                        </Card.Content.Link>

                        <Card.Content.Link href={GRAPHQL_URL} target="_blank">
                            GrapQL
                            <ArrowTopRightOnSquareIcon className="h-3" />
                        </Card.Content.Link>
                    </Card.Content>
                </Card>

                <Card>
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
    );
};

export default LandingPage;
