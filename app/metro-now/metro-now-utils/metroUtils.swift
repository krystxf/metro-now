//
//  metroUtils.swift
//  metro-now
//
//  Created by Kryštof Krátký on 15.05.2024.
//

import Foundation
import SwiftUI

let metroRoutesGeoJSON: MetroRoutesGeoJSON! = getParsedJSONFile(.METRO_STATIONS_FILE)

let metroStationsGeoJSON: MetroStationsGeoJSON! = getParsedJSONFile(.METRO_STATIONS_FILE)

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
