import { notFound } from "next/navigation";
import { graphqlFetch } from "@/utils/graphql-client";
import { StopModal } from "../../[id]/StopModal";

type Stop = {
    id: string;
    feed: string | null;
    name: string;
};

const getStop = async (id: string): Promise<Stop | null> => {
    try {
        const data = await graphqlFetch<{ stop: Stop | null }>(
            `query GetStopModal($id: ID!) {
                stop(id: $id) {
                    id
                    feed
                    name
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

export default async function InterceptedStopPage({ params }: Props) {
    const { feedId, id } = await params;
    const stop = await getStop(decodeURIComponent(id));
    const decodedFeedId = decodeURIComponent(feedId);

    if (!stop || stop.feed !== decodedFeedId) {
        notFound();
    }

    return <StopModal stopId={stop.id} stopName={stop.name} />;
}
