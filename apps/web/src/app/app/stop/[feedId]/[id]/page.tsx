import Link from "next/link";
import { notFound } from "next/navigation";
import { graphqlFetch } from "@/utils/graphql-client";
import { getTitle } from "@/utils/metadata.utils";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { DepartureBoard } from "../../[id]/DepartureBoard";
import type { Metadata } from "next";

type Stop = {
    id: string;
    feed: string | null;
    name: string;
    avgLatitude: number;
    avgLongitude: number;
};

const fetchStop = async (id: string): Promise<Stop | null> => {
    try {
        const data = await graphqlFetch<{ stop: Stop | null }>(
            `query GetStop($id: ID!) {
                stop(id: $id) {
                    id
                    feed
                    name
                    avgLatitude
                    avgLongitude
                }
            }`,
            { id },
            { next: { revalidate: 3600 } },
        );

        return data.stop;
    } catch {
        return null;
    }
};

type Props = {
    params: Promise<{ feedId: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { feedId, id } = await params;
    const stop = await fetchStop(decodeURIComponent(id));
    const decodedFeedId = decodeURIComponent(feedId);

    return {
        title:
            stop?.feed === decodedFeedId ? getTitle(stop.name) : getTitle("Stop"),
        description:
            stop?.feed === decodedFeedId
                ? `Real-time departures from ${stop.name}`
                : "Stop not found",
    };
}

export default async function StopDetailPage({ params }: Props) {
    const { feedId, id } = await params;
    const stop = await fetchStop(decodeURIComponent(id));
    const decodedFeedId = decodeURIComponent(feedId);

    if (!stop || stop.feed !== decodedFeedId) {
        notFound();
    }

    return (
        <main className="max-w-screen-sm mx-auto px-4 mt-24 pb-12 text-black dark:text-white">
            <Link
                href="/app"
                className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 mb-6"
            >
                <ArrowLeftIcon className="h-4 w-4" />
                Back
            </Link>

            <h1 className="text-2xl font-bold mb-4">{stop.name}</h1>

            <DepartureBoard stopId={stop.id} />
        </main>
    );
}
