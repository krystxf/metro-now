"use client";

import { useEffect, useState } from "react";
import MapGL, { Source, Layer } from "react-map-gl";
import { pragueCoorinates } from "@/constants/coordinates";
import { pointsLayer } from "@/app/map/map-layers/point-layer";
import { heatmapLayer } from "@/app/map/map-layers/heatmap-layer";
import { PidLogo } from "@/components/PidLogo/PidLogo";

type Datapoint = {
    latitude: number;
    longitude: number;
    name: string;
};

export default function MapPage() {
    const [geojson, setGeojson] = useState<any>(null);
    const [allowZoom, setAllowZoom] = useState(false);

    const udpateGeojson = async () => {
        const res = await fetch("https://api.metronow.dev/v1/platform/all");
        const data: Datapoint[] = await res.json();

        setGeojson({
            type: "FeatureCollection",
            features: data.map((stop) => ({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [stop.longitude, stop.latitude],
                },
            })),
        });
    };

    useEffect(() => {
        udpateGeojson();
    }, []);

    return (
        <div
            className="flex mt-24 items-center flex-col w-full gap-4 justify-center bg-white dark:bg-black"
            onMouseLeave={() => setAllowZoom(false)}
            onClick={() => setAllowZoom(true)}
        >
            <div className="max-w-screen-lg w-full flex items-center justify-around dark:text-neutral-300 text-neutral-800">
                <span className="flex flex-col gap-2 items-center text-lg">
                    <PidLogo className="h-18" />
                    Prague integrated transport
                </span>
            </div>

            <div className="h-[80vh] w-full relative">
                <MapGL
                    initialViewState={{
                        ...pragueCoorinates,
                        zoom: 6,
                    }}
                    dragRotate={false}
                    maxZoom={18}
                    minZoom={5}
                    style={{
                        position: "relative",
                        display: "block",
                    }}
                    boxZoom={false}
                    keyboard={false}
                    scrollZoom={allowZoom}
                    mapStyle="mapbox://styles/mapbox/dark-v9"
                    mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                    attributionControl={false}
                >
                    {geojson && (
                        <Source type="geojson" data={geojson as any}>
                            <Layer {...heatmapLayer} />
                            <Layer {...pointsLayer} />
                        </Source>
                    )}
                </MapGL>
            </div>
        </div>
    );
}
