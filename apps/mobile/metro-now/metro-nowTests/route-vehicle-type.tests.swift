// metro-now
// https://github.com/krystxf/metro-now

import Foundation
import Testing

struct GetRouteTypeTests {
    @Test("bus", arguments: ["X100", "X728", "100", "128", "245", "348", "899", "BB1", "BB2"])
    func getBusRouteType(routeName: String) {
        let result = getRouteType(routeName)
        #expect(result.rawValue == RouteType.bus.rawValue)
    }

    @Test("tram", arguments: ["X1", "X33", "1", "12", "89"])
    func getTramRouteType(routeName: String) {
        let result = getRouteType(routeName)
        #expect(result.rawValue == RouteType.tram.rawValue)
    }

    @Test("night", arguments: ["X95", "95", "99", "950", "X950"])
    func getNightRouteType(routeName: String) {
        let result = getRouteType(routeName)
        #expect(result.rawValue == RouteType.night.rawValue)
    }

    @Test("funicular", arguments: ["LD", "LD1"])
    func getFunicularRouteType(routeName: String) {
        let result = getRouteType(routeName)
        #expect(result.rawValue == RouteType.funicular.rawValue)
    }

    @Test("ferry", arguments: ["XP", "P", "P0", "P1", "P2", "P3", "P4", "P50", "P999"])
    func getFerryRouteType(routeName: String) {
        let result = getRouteType(routeName)
        #expect(result.rawValue == RouteType.ferry.rawValue)
    }

    @Test("train", arguments: ["XS1", "XR90", "S1", "S22", "R2", "R700"])
    func getTrainRouteType(routeName: String) {
        let result = getRouteType(routeName)
        #expect(result.rawValue == RouteType.train.rawValue)
    }
}
