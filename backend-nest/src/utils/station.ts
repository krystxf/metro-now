import { platformsByMetroStation } from "../data/metro-stations";
import type { PlatformID } from "../data/platforms";
import { parseMetroStation } from "../validation/metro-station";

type GetPlatformsByStation = (
    station: string | string[],
) => PlatformID[] | null;

export const getPlatformsByStation: GetPlatformsByStation = (station) => {
    if (Array.isArray(station)) {
        return station.flatMap(getPlatformsByStation).filter(Boolean);
    }

    const parsedMetroStation = parseMetroStation(station);

    if (!parsedMetroStation) {
        return null;
    }

    return platformsByMetroStation[parsedMetroStation];
};
