"use server";

type Datapoint = {
    latitude: number;
    longitude: number;
    name: string;
};
export const getStopsGeojson = async () => {
    const res = await fetch("https://api.metronow.dev/v1/platform/all");
    const data: Datapoint[] = await res.json();

    const geojson = {
        type: "FeatureCollection",
        features: data.map((stop) => ({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [stop.longitude, stop.latitude],
            },
        })),
    };

    return geojson;
};
