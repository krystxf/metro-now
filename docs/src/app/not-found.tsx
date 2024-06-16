import { Button } from "@/components/Button";
import Link from "next/link";

const NotFoundPage = () => {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-6 px-4">
            <div className="space-y-2 text-center">
                <h1 className="text-9xl font-bold">404</h1>
                <p className="text-2xl font-medium">
                    Oops, the page you&rsquo;re looking for cannot be found.
                </p>
            </div>
            <div className="flex gap-4">
                <Link href="/" legacyBehavior>
                    <Button as="a">Landing page</Button>
                </Link>
                <Link href="/docs" legacyBehavior>
                    <Button as="a">Documentation</Button>
                </Link>
            </div>
        </div>
    );
};

export default NotFoundPage;
