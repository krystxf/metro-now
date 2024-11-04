import { Card } from "@/components/Card";
import { APP_STORE_LINK, GITHUB, GRAPHQL, SWAGGER } from "@/const";
import Image from "next/image";
import DownloadOnAppStoreImage from "../../public/download-on-appstore-white.svg";
import Link from "next/link";

const LandingPage = () => {
    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <div className="flex flex-col gap-2 items-center justify-center text-center">
                <h1 className="text-6xl font-bold text-slate-800">
                    Metro Now!
                </h1>
                <p className="text-slate-800">
                    Get a real-time overview of metro departures from the
                    nearest stop in Prague
                </p>
                <Link href={APP_STORE_LINK}>
                    <Image
                        src={DownloadOnAppStoreImage}
                        className="mt-4"
                        alt="Download on App Store"
                        height={50}
                    />
                </Link>
            </div>
            <Image
                src="/metro-now-watch.png"
                alt="Apple watch screenshots"
                width={1200}
                height={1200}
                priority
            />

            <div className="mb-32 gap-4 grid text-center lg:mb-0 lg:w-full lg:max-w-7xl lg:grid-cols-3 lg:text-left">
                <Card className="group">
                    <a href={GITHUB} className="h-full" target="_blank">
                        <Card.Title>
                            Source code
                            <Card.Arrow />
                        </Card.Title>

                        <Card.Content className="opacity-50">
                            Every line of code for this project is available on
                            GitHub.
                        </Card.Content>
                    </a>
                </Card>

                <Card>
                    <a href="/docs" className="group">
                        <Card.Title>
                            Documentation <Card.Arrow />
                        </Card.Title>
                    </a>
                    <Card.Content>
                        <Card.Content.Link href={SWAGGER} target="_blank">
                            REST API
                            <Card.Arrow />
                        </Card.Content.Link>

                        <Card.Content.Link href={GRAPHQL} target="_blank">
                            GrapQL
                            <Card.Arrow />
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
