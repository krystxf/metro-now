// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

private let FALLBACK_COLOR: Color = .black

private let METRO_A_COLOR: Color = .green
private let METRO_B_COLOR: Color = .yellow
private let METRO_C_COLOR: Color = .red

private let NIGHT_COLOR: Color = .black
private let BUS_COLOR: Color = .blue
private let TRAM_COLOR: Color = .indigo
private let FERRY_COLOR: Color = .cyan
private let FUNICULAR_COLOR: Color = .brown
private let TRAIN_COLOR: Color = .gray

func getColorByRouteName(_ metroLine: MetroLine?) -> Color {
    switch metroLine {
    case .A: METRO_A_COLOR
    case .B: METRO_B_COLOR
    case .C: METRO_C_COLOR
    default: FALLBACK_COLOR
    }
}

func getColorByRouteName(_ routeNumber: Int?) -> Color {
    guard let routeNumber else {
        return FALLBACK_COLOR
    }

    // tram
    if routeNumber < 100 {
        if routeNumber >= 90 {
            return NIGHT_COLOR
        }

        return TRAM_COLOR
    }

    // bus
    if routeNumber >= 900 {
        return NIGHT_COLOR
    }

    return BUS_COLOR
}

func getColorByRouteName(_ routeName: String?) -> Color {
    guard let routeName else {
        return FALLBACK_COLOR
    }

    if let routeNumber = Int(routeName) {
        return getColorByRouteName(routeNumber)
    } else if let metroLine = MetroLine(rawValue: routeName.uppercased()) {
        return getColorByRouteName(metroLine)
    }

    // train
    if routeName.hasPrefix("S") || routeName.hasPrefix("R") {
        return TRAIN_COLOR
    }

    // ferry
    if routeName.hasPrefix("P") {
        return FERRY_COLOR
    }

    // funicular
    if routeName.hasPrefix("LD") {
        return FUNICULAR_COLOR
    }

    return FALLBACK_COLOR
}
