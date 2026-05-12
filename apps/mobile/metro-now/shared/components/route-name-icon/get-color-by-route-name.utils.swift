// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

func isSubstituteRoute(_ routeName: String?, feed: String? = nil) -> Bool {
    guard isPidFeed(feed), let routeName else {
        return false
    }

    return routeName.hasPrefix("X")
}

func getRouteColor(_ routeName: String?, feed: String? = nil) -> Color {
    if isSubstituteRoute(routeName, feed: feed) {
        return .orange
    }

    return getRouteType(routeName, feed: feed).color
}

func getRouteType(_ route: ApiRoute) -> RouteType {
    if route.isNight == true {
        return .night
    }

    guard let vehicleType = route.vehicleType?.uppercased() else {
        return getRouteType(route.name, feed: route.feed)
    }

    switch vehicleType {
    case "SUBWAY":
        if let metroLine = MetroLine(rawValue: route.name.uppercased()) {
            return .metro(metroLine)
        }
        return .train
    case "TRAM":
        return .tram
    case "BUS", "TROLLEYBUS":
        return .bus
    case "FERRY":
        return .ferry
    case "FUNICULAR":
        return .funicular
    case "TRAIN":
        if route.feed?.uppercased() == "LEO" {
            return .leoExpress
        }
        return .train
    default:
        return .fallback
    }
}

/// String-only fallback used where only a route label is available (widgets,
/// live activities, Watch app). These surfaces are metro-only in practice, so
/// classification is limited to Prague metro lines A/B/C.
func getRouteType(_ routeName: String?, feed _: String? = nil) -> RouteType {
    guard let routeName else {
        return .fallback
    }

    var normalized = routeName
    if normalized.hasPrefix("X") {
        normalized.removeFirst()
    }

    if let metroLine = MetroLine(rawValue: normalized.uppercased()) {
        return .metro(metroLine)
    }

    return .fallback
}
