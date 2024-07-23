//
//  metro-now
//

import MapKit
import SwiftUI

private struct MetroStationAnnotationType {
    var name: String
    let coordinate: CLLocationCoordinate2D
    let metroLines: [String] // A | B | C
}

struct MapView: View {
    @State private var metroStationAnnotations: [MetroStationAnnotationType] = []
    @State private var stops: [Stop]?
    @State private var visibleStops: [Stop] = []

    var body: some View {
        NavigationStack {
            Map {
                UserAnnotation()

                ForEach(metroStationAnnotations, id: \.name) { station in
                    Annotation(station.name, coordinate: station.coordinate) {
                        NavigationLink(
                            destination: StationDetailView(
                                stationName: station.name,
                                showMap: true,
                                showDirection: true
                            )
                        ) {
                            MetroAnnotationStack(metroLines: station.metroLines)
                        }
                    }
                }

                ForEach($visibleStops.wrappedValue, id: \.id) { stop in
                    Annotation( // stop.name
                        "",
                        coordinate: CLLocationCoordinate2D(
                            latitude: stop.latitude,
                            longitude: stop.longitude
                        )
                    ) {
                        BusStationAnnotation()
                            .frame(
                                width: 4,
                                height: 4
                            )
                    }
                }
            }
        }

        .onMapCameraChange {
            bounds in
            print(bounds)
            let region = bounds.region
            guard stops?.count ?? 0 > 0 else {
                visibleStops = []
                return
            }

            var i = 0
            let filteredStops = stops!.compactMap { element in
                if element.latitude > region.center.latitude - region.span.latitudeDelta,
                   element.latitude < region.center.latitude + region.span.latitudeDelta,
                   element.longitude > region.center.longitude - region.span.longitudeDelta,
                   element.longitude < region.center.longitude + region.span.longitudeDelta,
                   i < 100
                {
                    i += 1
                    return element
                }
                return nil
            }

            visibleStops = filteredStops
        }
        .task {
            let metroStationsGeoJSON: MetroStationsGeoJSON! = getParsedJSONFile(
                .METRO_STATIONS_FILE
            )
            guard metroStationsGeoJSON != nil, metroStationsGeoJSON?.features != nil else {
                return
            }

            metroStationAnnotations = metroStationsGeoJSON.features.map { feature in

                MetroStationAnnotationType(
                    name: feature.properties.name,
                    coordinate: CLLocationCoordinate2D(
                        latitude: feature.geometry.coordinates[1],
                        longitude: feature.geometry.coordinates[0]
                    ),
                    metroLines: Array(Set(feature.properties.platforms.map(\.name)))
                )
            }
            do {
                stops = try await fetch("\(METRO_NOW_API)/stop/all")
            } catch { return }
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
