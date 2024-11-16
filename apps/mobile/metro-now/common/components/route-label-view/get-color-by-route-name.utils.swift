// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

func getRouteType(_ routeName: String?) -> RouteType {
    guard let routeName else {
        return RouteType.fallback
    }

    // metro
    if let metroLine = MetroLine(rawValue: routeName.uppercased()) {
        return RouteType.metro(metroLine)
    }
    // train
    else if routeName.hasPrefix("S") || routeName.hasPrefix("R") {
        return RouteType.train
    }
    // ferry
    else if routeName.hasPrefix("P") {
        return RouteType.ferry
    }
    // funicular
    else if routeName.hasPrefix("LD") {
        return RouteType.funicular
    }
    // bus or tram
    else if let routeNumber = Int(routeName) {
        // tram
        if routeNumber < 90 {
            return RouteType.tram
        }
        // night tram
        else if routeNumber < 100 {
            return RouteType.night
        }
        // bus
        else if routeNumber < 900 {
            return RouteType.bus
        }
        // night bus
        else if routeNumber < 1000 {
            return RouteType.night
        }
        // fallback
        else {
            return RouteType.bus
        }
    }

    return RouteType.fallback
}
