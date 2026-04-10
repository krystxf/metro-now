// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

func isSubstituteRoute(_ routeName: String?) -> Bool {
    guard let routeName else {
        return false
    }

    return routeName.hasPrefix("X")
}

func getRouteColor(_ routeName: String?) -> Color {
    if isSubstituteRoute(routeName) {
        return .orange
    }

    return getRouteType(routeName).color
}

func isRailRoute(_ routeName: String?) -> Bool {
    switch getRouteType(routeName) {
    case .metro, .train, .leoExpress:
        true
    default:
        false
    }
}

func getRouteType(_ routeName: String?) -> RouteType {
    guard var routeName else {
        return RouteType.fallback
    }

    if routeName.hasPrefix("X") {
        routeName.removeFirst()
    }

    // metro
    if let metroLine = MetroLine(rawValue: routeName.uppercased()) {
        return RouteType.metro(metroLine)
    }
    // funicular
    else if routeName.hasPrefix("LD") {
        return RouteType.funicular
    }
    // Leo Express
    else if routeName.hasPrefix("LE") {
        return RouteType.leoExpress
    }
    // train
    else if TRAIN_ROUTE_PREFIXES.contains(where: { routeName.hasPrefix($0) }) {
        return RouteType.train
    }
    // ferry
    else if routeName.hasPrefix("P") {
        return RouteType.ferry
    } else if routeName.hasPrefix("BB") {
        return RouteType.bus
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
