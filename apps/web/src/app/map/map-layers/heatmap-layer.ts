import { LayerProps } from "react-map-gl";

export const heatmapLayer: LayerProps = {
    id: "trees-heat",
    type: "heatmap",
    source: "trees",
    maxzoom: 15,
    paint: {
        // increase weight as diameter breast height increases
        "heatmap-weight": {
            property: "dbh",
            type: "exponential",
            stops: [
                [1, 0],
                [62, 1],
            ],
        },
        // increase intensity as zoom level increases
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
        // use sequential color palette to use exponentially as the weight increases
        "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(33,102,172,0)",
            0.2,
            "rgb(103,169,207)",
            0.4,
            "rgb(209,229,240)",
            0.6,
            "rgb(253,219,199)",
            0.8,
            "rgb(239,138,98)",
            0.9,
            "rgb(255,201,101)",
        ],
        // increase radius as zoom increases
        "heatmap-radius": {
            stops: [
                [11, 5],
                [15, 50],
            ],
        },
        // decrease opacity to transition into the circle layer
        "heatmap-opacity": {
            stops: [
                [14, 0.6],
                [15, 0],
            ],
        } as any,
    },
};
