// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI
import Testing

@Suite("isSubstituteRoute", .tags(.routes))
struct IsSubstituteRouteTests {
    @Test("substitute routes start with X", arguments: ["X100", "X1", "XS1", "XP"])
    func substituteRoutes(routeName: String) {
        #expect(isSubstituteRoute(routeName))
    }

    @Test("non-substitute routes", arguments: ["100", "A", "S1", "P3", "1"])
    func nonSubstituteRoutes(routeName: String) {
        #expect(!isSubstituteRoute(routeName))
    }

    @Test("nil returns false")
    func nilInput() {
        #expect(!isSubstituteRoute(nil))
    }
}

@Suite("isRailRoute", .tags(.routes))
struct IsRailRouteTests {
    @Test("metro lines are rail", arguments: ["A", "B", "C"])
    func metroIsRail(routeName: String) {
        #expect(isRailRoute(routeName))
    }

    @Test("train routes are rail", arguments: ["S1", "R2", "L4"])
    func trainIsRail(routeName: String) {
        #expect(isRailRoute(routeName))
    }

    @Test("leo express is rail", arguments: ["LE 100"])
    func leoExpressIsRail(routeName: String) {
        #expect(isRailRoute(routeName))
    }

    @Test("bus routes are not rail", arguments: ["100", "245"])
    func busNotRail(routeName: String) {
        #expect(!isRailRoute(routeName))
    }

    @Test("tram routes are not rail", arguments: ["1", "22"])
    func tramNotRail(routeName: String) {
        #expect(!isRailRoute(routeName))
    }

    @Test("ferry routes are not rail", arguments: ["P3"])
    func ferryNotRail(routeName: String) {
        #expect(!isRailRoute(routeName))
    }

    @Test("nil returns false")
    func nilInput() {
        #expect(!isRailRoute(nil))
    }
}

@Suite("getRouteColor", .tags(.routes))
struct GetRouteColorTests {
    @Test("substitute routes return orange")
    func substituteRoutesReturnOrange() {
        #expect(getRouteColor("X100") == .orange)
        #expect(getRouteColor("X1") == .orange)
    }

    @Test("non-substitute routes return route type color")
    func nonSubstituteUsesRouteTypeColor() {
        #expect(getRouteColor("100") == RouteType.bus.color)
        #expect(getRouteColor("1") == RouteType.tram.color)
    }

    @Test("nil returns fallback color")
    func nilInput() {
        #expect(getRouteColor(nil) == RouteType.fallback.color)
    }
}
