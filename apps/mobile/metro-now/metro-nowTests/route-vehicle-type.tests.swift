// metro-now
// https://github.com/krystxf/metro-now

import Foundation
import Testing

@Suite(.tags(.routes))
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

    @Test(
        "train",
        arguments: [
            "XS1",
            "XR90",
            "XL4",
            "XT1",
            "XU14",
            "XV41",
            "S1",
            "S22",
            "R2",
            "R700",
            "L4",
            "T1",
            "U14",
            "V41",
        ]
    )
    func getTrainRouteType(routeName: String) {
        let result = getRouteType(routeName)
        #expect(result.rawValue == RouteType.train.rawValue)
    }

    @Test("leo express", arguments: ["LE 100", "LE 200", "LE 1234", "XLE 100"])
    func getLeoExpressRouteType(routeName: String) {
        let result = getRouteType(routeName)
        #expect(result.rawValue == RouteType.leoExpress.rawValue)
    }
}
