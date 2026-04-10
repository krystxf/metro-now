// metro-now
// https://github.com/krystxf/metro-now

import Foundation
import Testing

@Suite(.tags(.api))
struct ApiPlatformSupportsTests {
    private let baseDate = Date(timeIntervalSince1970: 1000)

    private func makeDeparture(
        platformId: String,
        route: String,
        routeId: String? = nil
    ) -> ApiDeparture {
        ApiDeparture(
            id: "dep-1",
            platformId: platformId,
            platformCode: nil,
            headsign: "Test",
            departure: ApiDepartureDate(
                predicted: baseDate,
                scheduled: baseDate
            ),
            delay: 0,
            route: route,
            routeId: routeId,
            isRealtime: nil
        )
    }

    @Test("matches departure by platform ID and route name")
    func matchesByRouteName() {
        let platform = ApiPlatform(
            id: "P1",
            latitude: 50.0,
            longitude: 14.0,
            name: "Stop",
            code: nil,
            isMetro: false,
            routes: [ApiRoute(id: "1", name: "22")]
        )
        let departure = makeDeparture(platformId: "P1", route: "22")

        #expect(platform.supports(departure))
    }

    @Test("matches departure by route ID")
    func matchesByRouteId() {
        let platform = ApiPlatform(
            id: "P1",
            latitude: 50.0,
            longitude: 14.0,
            name: "Stop",
            code: nil,
            isMetro: false,
            routes: [ApiRoute(id: "991", name: "A")]
        )
        let departure = makeDeparture(platformId: "P1", route: "A", routeId: "991")

        #expect(platform.supports(departure))
    }

    @Test("matches departure by backend route ID with L prefix")
    func matchesByBackendRouteId() {
        let platform = ApiPlatform(
            id: "P1",
            latitude: 50.0,
            longitude: 14.0,
            name: "Stop",
            code: nil,
            isMetro: false,
            routes: [ApiRoute(id: "991", name: "A")]
        )
        let departure = makeDeparture(platformId: "P1", route: "A", routeId: "L991")

        #expect(platform.supports(departure))
    }

    @Test("rejects departure with different platform ID")
    func rejectsDifferentPlatformId() {
        let platform = ApiPlatform(
            id: "P1",
            latitude: 50.0,
            longitude: 14.0,
            name: "Stop",
            code: nil,
            isMetro: false,
            routes: [ApiRoute(id: "1", name: "22")]
        )
        let departure = makeDeparture(platformId: "P2", route: "22")

        #expect(!platform.supports(departure))
    }

    @Test("rejects departure with non-matching route")
    func rejectsNonMatchingRoute() {
        let platform = ApiPlatform(
            id: "P1",
            latitude: 50.0,
            longitude: 14.0,
            name: "Stop",
            code: nil,
            isMetro: false,
            routes: [ApiRoute(id: "1", name: "22")]
        )
        let departure = makeDeparture(platformId: "P1", route: "33")

        #expect(!platform.supports(departure))
    }

    @Test("accepts any departure when platform has no routes")
    func acceptsAnyWhenNoRoutes() {
        let platform = ApiPlatform(
            id: "P1",
            latitude: 50.0,
            longitude: 14.0,
            name: "Stop",
            code: nil,
            isMetro: false,
            routes: []
        )
        let departure = makeDeparture(platformId: "P1", route: "99")

        #expect(platform.supports(departure))
    }
}

@Suite(.tags(.api))
struct ApiRouteBackendRouteIdTests {
    @Test("adds L prefix when missing")
    func addsLPrefix() {
        let route = ApiRoute(id: "991", name: "A")
        #expect(route.backendRouteId == "L991")
    }

    @Test("keeps existing L prefix")
    func keepsExistingPrefix() {
        let route = ApiRoute(id: "L991", name: "A")
        #expect(route.backendRouteId == "L991")
    }
}
