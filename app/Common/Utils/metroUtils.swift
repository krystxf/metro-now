//
//  metro-now
//
//  Created by Kryštof Krátký on 15.05.2024.
//

import CoreLocation
import Foundation
import MapKit
import SwiftUI

enum MetroLine: String {
    case A
    case B
    case C
}

func getMetroLineColor(_ letter: String) -> Color {
    switch letter.uppercased() {
    case "A":
        .green
    case "B":
        .yellow
    case "C":
        .red
    default:
        .purple
    }
}

func getMetroLineColor(_ letter: MetroLine) -> Color {
    switch letter {
    case .A:
        .green
    case .B:
        .yellow
    case .C:
        .red
    }
}

func getMetroLineIcon(_ letter: String) -> String {
    "\(letter.lowercased()).circle.fill"
}

func getMetroLineIcon(_ letter: MetroLine) -> String {
    getMetroLineIcon(letter.rawValue)
}

func getClosestStationFromGeoJSON(location: CLLocation) -> MetroStationsGeoJSONFeature {
    let stations: MetroStationsGeoJSON? = getParsedJSONFile(.METRO_STATIONS_FILE)

    guard let stations, stations.features.count > 0 else {
        fatalError("No stations found")
    }

    var closestStationIndex = 0
    var closestStationDistance: Double = location.distance(from: CLLocation(
        latitude: stations.features[0].geometry.coordinates[1], longitude: stations.features[0].geometry.coordinates[0]
    ))

    for (index, station) in stations.features.enumerated() {
        let distance = location.distance(from: CLLocation(
            latitude: station.geometry.coordinates[1], longitude: station.geometry.coordinates[0]
        ))

        if closestStationDistance > distance {
            closestStationIndex = index
            closestStationDistance = distance
        }
    }

    return stations.features[closestStationIndex]
}

func getSortedStationsByDistance() {}
