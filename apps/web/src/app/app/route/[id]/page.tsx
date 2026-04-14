import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { RouteStopList } from "./RouteStopList";

type Props = {
    params: Promise<{ id: string }>;
};

export default async function RouteDetailPage({ params }: Props) {
    const { id } = await params;
    const routeId = decodeURIComponent(id);

    return (
        <main className="max-w-screen-sm mx-auto px-4 mt-24 pb-12 text-black dark:text-white">
            <Link
                href="/app"
                className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 mb-6"
            >
                <ArrowLeftIcon className="h-4 w-4" />
                Back
            </Link>

            <RouteStopList routeId={routeId} />
        </main>
    );
}
