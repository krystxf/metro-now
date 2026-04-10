// metro-now
// https://github.com/krystxf/metro-now

import Testing

@Suite("mapTransportMode", .tags(.routes, .map))
struct MapTransportModeTests {
    @Test("train routes", arguments: ["S1", "R2", "S22"])
    func trainRoutes(routeName: String) {
        #expect(mapTransportMode(for: routeName) == .train)
    }

    @Test("leo express routes", arguments: ["LE 100", "LE 200"])
    func leoExpressRoutes(routeName: String) {
        #expect(mapTransportMode(for: routeName) == .leoExpress)
    }

    @Test("funicular routes", arguments: ["LD", "LD1"])
    func funicularRoutes(routeName: String) {
        #expect(mapTransportMode(for: routeName) == .funicular)
    }

    @Test("ferry routes", arguments: ["P3", "P1"])
    func ferryRoutes(routeName: String) {
        #expect(mapTransportMode(for: routeName) == .ferry)
    }

    @Test("tram routes", arguments: ["1", "22", "12"])
    func tramRoutes(routeName: String) {
        #expect(mapTransportMode(for: routeName) == .tram)
    }

    @Test("bus routes", arguments: ["100", "245", "348"])
    func busRoutes(routeName: String) {
        #expect(mapTransportMode(for: routeName) == .bus)
    }

    @Test("night tram routes", arguments: ["95", "99"])
    func nightTramRoutes(routeName: String) {
        #expect(mapTransportMode(for: routeName) == .tram)
    }

    @Test("night bus routes", arguments: ["950", "910"])
    func nightBusRoutes(routeName: String) {
        #expect(mapTransportMode(for: routeName) == .bus)
    }

    @Test("metro routes return nil", arguments: ["A", "B", "C"])
    func metroRoutesReturnNil(routeName: String) {
        #expect(mapTransportMode(for: routeName) == nil)
    }
}

@Suite("isMapVisibleRoute", .tags(.routes, .map))
struct IsMapVisibleRouteTests {
    @Test("visible routes", arguments: ["S1", "1", "100", "P3", "LD", "LE 100", "95", "950"])
    func visibleRoutes(routeName: String) {
        #expect(isMapVisibleRoute(routeName))
    }

    @Test("metro routes are not map visible", arguments: ["A", "B", "C"])
    func metroNotVisible(routeName: String) {
        #expect(!isMapVisibleRoute(routeName))
    }
}
