// metro-now
// https://github.com/krystxf/metro-now

@_spi(Experimental) import MapboxMaps
import SwiftUI

struct MapTrafficLayers: MapContent {
    var body: some MapContent {
        VectorSource(id: "mapbox-traffic")
            .url("mapbox://mapbox.mapbox-traffic-v1")

        LineLayer(id: "traffic-low", source: "mapbox-traffic")
            .sourceLayer("traffic")
            .filter(Exp(.eq) { Exp(.get) { "congestion" }; "low" })
            .lineColor(StyleColor(UIColor.systemGreen))
            .lineWidth(1.5)
            .lineOpacity(0.4)
            .slot(.middle)

        LineLayer(id: "traffic-moderate", source: "mapbox-traffic")
            .sourceLayer("traffic")
            .filter(Exp(.eq) { Exp(.get) { "congestion" }; "moderate" })
            .lineColor(StyleColor(UIColor.systemYellow))
            .lineWidth(2)
            .lineOpacity(0.6)
            .slot(.middle)

        LineLayer(id: "traffic-heavy", source: "mapbox-traffic")
            .sourceLayer("traffic")
            .filter(Exp(.eq) { Exp(.get) { "congestion" }; "heavy" })
            .lineColor(StyleColor(UIColor.systemOrange))
            .lineWidth(2.5)
            .lineOpacity(0.7)
            .slot(.middle)

        LineLayer(id: "traffic-severe", source: "mapbox-traffic")
            .sourceLayer("traffic")
            .filter(Exp(.eq) { Exp(.get) { "congestion" }; "severe" })
            .lineColor(StyleColor(UIColor.systemRed))
            .lineWidth(3)
            .lineOpacity(0.8)
            .slot(.middle)
    }
}
