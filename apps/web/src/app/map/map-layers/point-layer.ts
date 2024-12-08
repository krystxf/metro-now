import { LayerProps } from "react-map-gl";

export const pointsLayer: LayerProps = {
    id: "trees-point",
    type: "circle",
    source: "trees",
    minzoom: 14,
    paint: {
        // increase the radius of the circle as the zoom level and dbh value increases
        "circle-radius": {
            property: "dbh",
            type: "exponential",
            stops: [
                [{ zoom: 15, value: 1 }, 5],
                [{ zoom: 15, value: 62 }, 10],
                [{ zoom: 22, value: 1 }, 20],
                [{ zoom: 22, value: 62 }, 50],
            ],
        },
        "circle-color": {
            property: "dbh",
            type: "exponential",
            stops: [
                [0, "rgba(236,222,239,0)"],
                [10, "rgb(236,222,239)"],
                [20, "rgb(208,209,230)"],
                [30, "rgb(166,189,219)"],
                [40, "rgb(103,169,207)"],
                [50, "rgb(28,144,153)"],
                [60, "rgb(1,108,89)"],
            ],
        },
        "circle-stroke-color": "white",
        "circle-stroke-width": 1,
        "circle-opacity": {
            stops: [
                [14, 0],
                [15, 1],
            ],
        },
    },
};
