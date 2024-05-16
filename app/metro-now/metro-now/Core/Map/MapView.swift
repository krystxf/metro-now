//
//  MapView.swift
//  metro-now
//
//  Created by Kryštof Krátký on 15.05.2024.
//

import MapKit
import SwiftUI

struct MapView: View {
    let stations: MetroRoutesGeoJSON! = getParsedJSONFile(.METRO_STATIONS_FILE)

    var body: some View {
        Map()
        //        Map {
//            ForEach(stations.features, id: \.properties.na) { station in
//                Annotation(
//                    station.name,
//                    coordinate: CLLocationCoordinate2D(
//                        latitude: station.avgLat,
//                        longitude: station.avgLon
//                    )
//                ) {
//                    ZStack {
//                        RoundedRectangle(cornerRadius: .infinity)
//                            .foregroundColor(
//                                .white
//                            )
//                        Image(systemName: "\(station.platforms[0].name!.lowercased()).circle.fill")
//                            .foregroundColor(
//                                getMetroLineColor(station.platforms[0].name!)
//                            )
//                    }
//                }
//            }
//        }
    }
}

#Preview {
    MapView(
    )
}
