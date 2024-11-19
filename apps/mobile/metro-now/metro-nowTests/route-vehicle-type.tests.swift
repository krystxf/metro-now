// metro-now
// https://github.com/krystxf/metro-now

import Foundation
import Testing

@Suite("getRouteType")
struct GetRouteTypeTests {
    @Test("bus", arguments: ["X100", "X728", "100", "128", "245", "348", "899", "BB1", "BB2"])
    func testGetBusRouteType(routeName: String) async throws {
        let result = getRouteType(routeName)
        #expect(result.rawValue == RouteType.bus.rawValue)
    }

    @Test("tram", arguments: ["X1", "X33", "1", "12", "89"])
    func testGetTramRouteType(routeName: String) async throws {
        let result = getRouteType(routeName)
        #expect(result.rawValue == RouteType.tram.rawValue)
    }

    @Test("night", arguments: ["X95", "95", "99", "950", "X950"])
    func testGetNightRouteType(routeName: String) async throws {
        let result = getRouteType(routeName)
        #expect(result.rawValue == RouteType.night.rawValue)
    }

    @Test("funicular", arguments: ["LD", "LD1"])
    func testGetFunicularRouteType(routeName: String) async throws {
        let result = getRouteType(routeName)
        #expect(result.rawValue == RouteType.funicular.rawValue)
    }

    @Test("ferry", arguments: ["XP", "P", "P0", "P1", "P2", "P3", "P4", "P50", "P999"])
    func testGetFerryRouteType(routeName: String) async throws {
        let result = getRouteType(routeName)
        #expect(result.rawValue == RouteType.ferry.rawValue)
    }

    @Test("train", arguments: ["XS1", "XR90", "S1", "S22", "R2", "R700"])
    func testGetTrainRouteType(routeName: String) async throws {
        let result = getRouteType(routeName)
        #expect(result.rawValue == RouteType.train.rawValue)
    }
}
