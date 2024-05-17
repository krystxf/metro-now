//
//  MapView.swift
//  metro-now
//

import MapKit
import SwiftUI

struct MapView: View {
    let metroStationsGeoJSON: MetroStationsGeoJSON! = getParsedJSONFile(.METRO_STATIONS_FILE)

    var body: some View {
        Map {
            ForEach(metroStationsGeoJSON!.features, id: \.properties.name) { feature in
                let metroLines: [String] = Array(Set(feature.properties.platforms.map { $0.name! }))

                Annotation(
                    feature.properties.name,
                    coordinate: CLLocationCoordinate2D(
                        latitude: feature.geometry.coordinates[1],
                        longitude: feature.geometry.coordinates[0]
                    )
                ) {
                    ZStack {
                        ForEach(Array(metroLines.enumerated()), id: \.0) {
                            index, metroLine in

                  
                                Rectangle()
                                    .foregroundStyle(.white)
                                
                                    .clipShape(.rect(cornerRadius: .infinity))
                                    .offset(x: index == 0 ? 0 : -10, y: index == 0 ? 0 : -10)
                            
                            Image(
                                systemName:
                                getMetroLineIcon(metroLine)
                            )
                            .foregroundStyle(getMetroLineColor(metroLine))
                            .offset(x: index == 0 ? 0 : -10, y: index == 0 ? 0 : -10)
                        }
                    }
                }
            }
        }
        .mapStyle(.standard(elevation: .realistic))

    }
}

#Preview {
    MapView()
}
