// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

private let FALLBACK_COLOR: Color = .black

func getColorByRouteName(_ metroLine: MetroLine?) -> Color {
    switch metroLine {
    case .A:
        .green
    case .B:
        .yellow
    case .C:
        .red
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
            return .black
        }

        return .purple
    }

    // bus
    if routeNumber >= 900 {
        return .black
    }

    return .blue
}

func getColorByRouteName(_ routeName: String?) -> Color {
    guard let routeName else {
        return FALLBACK_COLOR
    }

    if let routeNumber = Int(routeName) {
        return getColorByRouteName(routeNumber)
    } else if let metroLine = MetroLine(rawValue: routeName) {
        return getColorByRouteName(metroLine)
    }

    // ferry
    if routeName.hasPrefix("P") {
        return Color.blue
    }

    // funicular
    if routeName.hasPrefix("LD") {
        return Color.blue
    }

    return FALLBACK_COLOR
}
