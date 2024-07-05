//
//  metro-now
//

import MapKit
import SwiftUI

private struct MetroStationAnnotation {
    var name: String
    let coordinate: CLLocationCoordinate2D
    let metroLines: [String] // A | B | C
}

struct MapView: View {
    @State private var metroStationAnnotations: [MetroStationAnnotation] = []

    var body: some View {
        NavigationStack {
            Map {
                UserAnnotation()

                ForEach(metroStationAnnotations, id: \.name) { station in
                    Annotation(station.name, coordinate: station.coordinate) {
                        NavigationLink(destination: StationDetailView(stationName: station.name, showMap: true, showDirection: true)) {
                            MapMetroStationView(metroLines: station.metroLines)
                        }
                    }
                }
            }
        }
        .task {
            let metroStationsGeoJSON: MetroStationsGeoJSON! = getParsedJSONFile(.METRO_STATIONS_FILE)
            guard metroStationsGeoJSON != nil, metroStationsGeoJSON?.features != nil else {
                return
            }

            metroStationAnnotations = metroStationsGeoJSON.features.map { feature in

                MetroStationAnnotation(
                    name: feature.properties.name,
                    coordinate: CLLocationCoordinate2D(
                        latitude: feature.geometry.coordinates[1],
                        longitude: feature.geometry.coordinates[0]
                    ),
                    metroLines: Array(Set(feature.properties.platforms.map(\.name)))
                )
            }
        }
        .mapStyle(.standard(elevation: .realistic, pointsOfInterest: .excludingAll))
        .mapControls {
            MapUserLocationButton()
            /// Shows up when you rotate the map
            MapCompass()
            /// 3D and 2D button on the top right
            MapPitchToggle()
        }
    }
}

#Preview {
    MapView()
}
