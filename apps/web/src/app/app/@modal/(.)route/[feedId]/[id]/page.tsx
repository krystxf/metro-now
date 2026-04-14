import { RouteModal } from "../../[id]/RouteModal";

type Props = {
    params: Promise<{ feedId: string; id: string }>;
};

export default async function InterceptedRoutePage({ params }: Props) {
    const { feedId, id } = await params;

    return (
        <RouteModal
            routeId={decodeURIComponent(id)}
            feedId={decodeURIComponent(feedId)}
        />
    );
}
