// metro-now
// https://github.com/krystxf/metro-now

@testable import metro_now
import Testing

@Suite(.tags(.map))
struct TransportStopAnnotationViewTests {
    @Test("recognizes Barcelona subway L-lines for tunnel icon override")
    func recognizesBarcelonaMetroRoute() {
        let route = ApiRoute(
            id: "route-1",
            name: "L1",
            feed: "BARCELONA",
            vehicleType: "SUBWAY"
        )

        #expect(isBarcelonaMetroAnnotationRoute(route))
    }

    @Test("ignores non-Barcelona subway routes and non-L labels")
    func ignoresOtherRoutes() {
        let pragueMetro = ApiRoute(
            id: "route-1",
            name: "A",
            feed: "PID",
            vehicleType: "SUBWAY"
        )
        let barcelonaTrain = ApiRoute(
            id: "route-2",
            name: "R1",
            feed: "BARCELONA",
            vehicleType: "TRAIN"
        )

        #expect(!isBarcelonaMetroAnnotationRoute(pragueMetro))
        #expect(!isBarcelonaMetroAnnotationRoute(barcelonaTrain))
    }

    @Test("recognizes Barcelona tram T-lines for tram icon override")
    func recognizesBarcelonaTramRoute() {
        let route = ApiRoute(
            id: "route-3",
            name: "T4",
            feed: "BARCELONA",
            vehicleType: "TRAM"
        )

        #expect(isBarcelonaTramAnnotationRoute(route))
    }

    @Test("ignores non-Barcelona or non T1-T6 tram routes")
    func ignoresOtherTramRoutes() {
        let otherFeedTram = ApiRoute(
            id: "route-4",
            name: "T4",
            feed: "PID",
            vehicleType: "TRAM"
        )
        let nonBarcelonaBranding = ApiRoute(
            id: "route-5",
            name: "L4",
            feed: "BARCELONA",
            vehicleType: "TRAM"
        )
        let outOfRangeBarcelonaTram = ApiRoute(
            id: "route-6",
            name: "T7",
            feed: "BARCELONA",
            vehicleType: "TRAM"
        )

        #expect(!isBarcelonaTramAnnotationRoute(otherFeedTram))
        #expect(!isBarcelonaTramAnnotationRoute(nonBarcelonaBranding))
        #expect(!isBarcelonaTramAnnotationRoute(outOfRangeBarcelonaTram))
    }

    @Test("shows route overlays only for metro routes and Barcelona trams")
    func selectsMapOverlayRoutes() {
        let barcelonaMetro = ApiRoute(
            id: "route-7",
            name: "L2",
            feed: "BARCELONA",
            vehicleType: "SUBWAY"
        )
        let barcelonaTram = ApiRoute(
            id: "route-8",
            name: "T3",
            feed: "BARCELONA",
            vehicleType: "TRAM"
        )
        let pragueTram = ApiRoute(
            id: "route-9",
            name: "22",
            feed: "PID",
            vehicleType: "TRAM"
        )

        #expect(shouldShowMapRouteOverlay(barcelonaMetro))
        #expect(shouldShowMapRouteOverlay(barcelonaTram))
        #expect(!shouldShowMapRouteOverlay(pragueTram))
    }

    @Test("collects unique Barcelona metro and tram annotation routes")
    func collectsBarcelonaAnnotationRoutes() {
        let metroRoutes = [
            ApiRoute(id: "m2", name: "L2", feed: "BARCELONA", vehicleType: "SUBWAY"),
            ApiRoute(id: "m1", name: "L1", feed: "BARCELONA", vehicleType: "SUBWAY"),
            ApiRoute(id: "m1", name: "L1", feed: "BARCELONA", vehicleType: "SUBWAY"),
        ]
        let tramRoutes = [
            ApiRoute(id: "t3", name: "T3", feed: "BARCELONA", vehicleType: "TRAM"),
            ApiRoute(id: "t1", name: "T1", feed: "BARCELONA", vehicleType: "TRAM"),
            ApiRoute(id: "other", name: "22", feed: "PID", vehicleType: "TRAM"),
        ]

        #expect(barcelonaMetroAnnotationRoutes(metroRoutes).map(\.name) == ["L1", "L2"])
        #expect(barcelonaTramAnnotationRoutes(tramRoutes).map(\.name) == ["T1", "T3"])
    }
}
