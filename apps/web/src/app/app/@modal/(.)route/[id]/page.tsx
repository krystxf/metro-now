import { RouteModal } from "./RouteModal";

type Props = {
    params: Promise<{ id: string }>;
};

export default async function InterceptedRoutePage({ params }: Props) {
    const { id } = await params;
    const routeId = decodeURIComponent(id);

    return <RouteModal routeId={routeId} />;
}
