//
//  MapView.swift
//  metro-now
//
//  Created by Kryštof Krátký on 15.05.2024.
//

import MapKit
import SwiftUI

struct MapView: View {
    let metroStationsGeoJSON: MetroStationsGeoJSON! = getParsedJSONFile(.METRO_STATIONS_FILE)

    var body: some View {
        Map {
            ForEach(metroStationsGeoJSON!.features, id: \.properties.name) { feature in
                Annotation(
                    feature.properties.name,
                    coordinate: CLLocationCoordinate2D(
                        latitude: feature.geometry.coordinates[1],
                        longitude: feature.geometry.coordinates[0]
                    )
                ) {
                    ZStack {
                        RoundedRectangle(cornerRadius: .infinity)
                            .foregroundColor(
                                .white
                            )
                        Image(systemName: "\(feature.properties.platforms[0].name!.lowercased()).circle.fill")
                            .foregroundColor(
                                getMetroLineColor(feature.properties.platforms[0].name!)
                            )
                    }
                }
            }
        }
    }
}

#Preview {
    MapView(
    )
}
