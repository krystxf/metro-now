// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import Foundation
import Testing

@Suite("StopLocation", .tags(.api, .map))
struct StopLocationTests {
    @Test("prefers entrance centroid over averaged stop-group coordinate")
    func prefersEntranceCentroid() {
        let stop = ApiStop(
            id: "U1072",
            name: "Můstek",
            avgLatitude: 50.0818176,
            avgLongitude: 14.4255056,
            entrances: [
                ApiStopEntrance(
                    id: "U1072E1",
                    name: "Entrance A",
                    latitude: 50.08312,
                    longitude: 14.42496
                ),
                ApiStopEntrance(
                    id: "U1072E2",
                    name: "Entrance B",
                    latitude: 50.08394,
                    longitude: 14.42415
                ),
            ],
            platforms: []
        )

        #expect(abs(stop.preferredCoordinate.latitude - 50.08353) < 0.000001)
        #expect(abs(stop.preferredCoordinate.longitude - 14.424555) < 0.000001)
    }

    @Test("uses the nearest entrance for distance calculations")
    func usesNearestEntranceDistance() {
        let stop = ApiStop(
            id: "U1072",
            name: "Můstek",
            avgLatitude: 50.0818176,
            avgLongitude: 14.4255056,
            entrances: [
                ApiStopEntrance(
                    id: "U1072E1",
                    name: "Entrance A",
                    latitude: 50.08312,
                    longitude: 14.42496
                ),
            ],
            platforms: []
        )
        let location = CLLocation(
            latitude: 50.08312,
            longitude: 14.42496
        )
        let averageDistance = location.distance(
            from: CLLocation(
                latitude: stop.avgLatitude,
                longitude: stop.avgLongitude
            )
        )

        #expect(stop.distance(to: location) < 1)
        #expect(stop.distance(to: location) < averageDistance)
    }

    @Test("falls back to metro platform centroid when entrances are unavailable")
    func fallsBackToMetroPlatformCentroid() {
        let stop = ApiStop(
            id: "U1072",
            name: "Můstek",
            avgLatitude: 50.0818176,
            avgLongitude: 14.4255056,
            entrances: [],
            platforms: [
                ApiPlatform(
                    id: "U1072Z101P",
                    latitude: 50.08312,
                    longitude: 14.42496,
                    name: "Můstek",
                    code: nil,
                    isMetro: true,
                    routes: []
                ),
                ApiPlatform(
                    id: "U1072Z102P",
                    latitude: 50.08342,
                    longitude: 14.42436,
                    name: "Můstek",
                    code: nil,
                    isMetro: true,
                    routes: []
                ),
            ]
        )

        #expect(abs(stop.preferredCoordinate.latitude - 50.08327) < 0.000001)
        #expect(abs(stop.preferredCoordinate.longitude - 14.42466) < 0.000001)
    }

    @Test("renders metro stations and surface platforms separately on the map")
    func rendersMetroStationsAndSurfacePlatforms() {
        let stop = ApiStop(
            id: "U1072",
            name: "Václavské náměstí",
            avgLatitude: 50.0818176,
            avgLongitude: 14.4255056,
            entrances: [
                ApiStopEntrance(
                    id: "U1072E1",
                    name: "Můstek A",
                    latitude: 50.08312,
                    longitude: 14.42496
                ),
            ],
            platforms: [
                ApiPlatform(
                    id: "U1072Z101P",
                    latitude: 50.08312,
                    longitude: 14.42496,
                    name: "Můstek",
                    code: "M1A",
                    isMetro: true,
                    routes: [ApiRoute(id: "991", name: "A")]
                ),
                ApiPlatform(
                    id: "U1072Z102P",
                    latitude: 50.08394,
                    longitude: 14.42415,
                    name: "Můstek",
                    code: "M2A",
                    isMetro: true,
                    routes: [ApiRoute(id: "991", name: "A")]
                ),
                ApiPlatform(
                    id: "U1072Z1P",
                    latitude: 50.08167,
                    longitude: 14.42527,
                    name: "Václavské náměstí",
                    code: "A",
                    isMetro: false,
                    routes: [ApiRoute(id: "3", name: "3")]
                ),
            ]
        )

        let annotations = buildRailStopMapAnnotations(from: [stop])
        let metroAnnotation = annotations.first(where: \.isMetro)
        let transportPlatformLabels = annotations
            .filter { !$0.isMetro }
            .map(\.stop.name)

        #expect(annotations.count == 2)
        #expect(metroAnnotation?.stop.name == "Můstek")
        #expect(metroAnnotation?.metroLineNames == ["A"])
        #expect(transportPlatformLabels == ["Václavské náměstí A"])
        #expect(metroAnnotation?.stop.platforms.allSatisfy(\.isMetro) == true)
        #expect(metroAnnotation?.stop.platforms.count == 2)
        #expect(abs((metroAnnotation?.coordinate.latitude ?? 0) - 50.08312) < 0.000001)
        #expect(abs((metroAnnotation?.coordinate.longitude ?? 0) - 14.42496) < 0.000001)
        #expect(annotations.filter { !$0.isMetro }.allSatisfy { $0.stop.platforms.count == 1 })
    }

    @Test("renders train and surface platforms at their own coordinates")
    func rendersTrainAndSurfacePlatformsAtTheirOwnCoordinates() {
        let stop = ApiStop(
            id: "U5000",
            name: "Praha-Smichov",
            avgLatitude: 50.061,
            avgLongitude: 14.408,
            entrances: [],
            platforms: [
                ApiPlatform(
                    id: "U5000Z1P",
                    latitude: 50.0601,
                    longitude: 14.4071,
                    name: "Praha-Smichov",
                    code: "1",
                    isMetro: false,
                    routes: [ApiRoute(id: "1", name: "S7")]
                ),
                ApiPlatform(
                    id: "U5000Z2P",
                    latitude: 50.0605,
                    longitude: 14.4077,
                    name: "Praha-Smichov",
                    code: "2",
                    isMetro: false,
                    routes: [ApiRoute(id: "2", name: "R16")]
                ),
                ApiPlatform(
                    id: "U5000Z3P",
                    latitude: 50.0619,
                    longitude: 14.4093,
                    name: "Lihovar",
                    code: "A",
                    isMetro: false,
                    routes: [ApiRoute(id: "2", name: "172")]
                ),
            ]
        )

        let annotations = buildRailStopMapAnnotations(from: [stop])
        let trainAnnotation = annotations.first { $0.transportModes == [.train] }
        let transportAnnotation = annotations.first { $0.stop.name == "Lihovar A" }

        #expect(annotations.count == 2)
        #expect(trainAnnotation != nil)
        #expect(transportAnnotation != nil)
        #expect(trainAnnotation?.stop.name == "Praha-Smichov")
        #expect(trainAnnotation?.stop.platforms.count == 2)
        #expect(abs((trainAnnotation?.coordinate.latitude ?? 0) - 50.0603) < 0.000001)
        #expect(abs((trainAnnotation?.coordinate.longitude ?? 0) - 14.4074) < 0.000001)
        #expect(transportAnnotation?.coordinate.latitude == 50.0619)
        #expect(transportAnnotation?.coordinate.longitude == 14.4093)
    }

    @Test("keeps metro stations distinct from surface platforms in mixed stop groups")
    func keepsMetroStationsDistinctFromSurfacePlatformsInMixedStopGroups() {
        let stop = ApiStop(
            id: "U480",
            name: "Praha Masarykovo nádr.",
            avgLatitude: 50.087,
            avgLongitude: 14.431,
            entrances: [],
            platforms: [
                ApiPlatform(
                    id: "U480Z101P",
                    latitude: 50.0882,
                    longitude: 14.4308,
                    name: "Náměstí Republiky",
                    code: "M1",
                    isMetro: true,
                    routes: [ApiRoute(id: "992", name: "B")]
                ),
                ApiPlatform(
                    id: "U480Z301",
                    latitude: 50.0866,
                    longitude: 14.4351,
                    name: "Praha Masarykovo n.",
                    code: nil,
                    isMetro: false,
                    routes: [ApiRoute(id: "1", name: "S1")]
                ),
                ApiPlatform(
                    id: "U480Z3P",
                    latitude: 50.0876,
                    longitude: 14.4321,
                    name: "Masarykovo nádraží",
                    code: "C",
                    isMetro: false,
                    routes: [ApiRoute(id: "2", name: "14")]
                ),
                ApiPlatform(
                    id: "U480Z1P",
                    latitude: 50.0887,
                    longitude: 14.4299,
                    name: "Náměstí Republiky",
                    code: "A",
                    isMetro: false,
                    routes: [ApiRoute(id: "3", name: "207")]
                ),
            ]
        )

        let annotations = buildRailStopMapAnnotations(from: [stop])

        #expect(annotations.count == 4)
        #expect(annotations.contains { $0.stop.name == "Náměstí Republiky" && $0.metroLineNames == ["B"] })
        #expect(annotations.contains { $0.stop.name == "Praha Masarykovo n." && $0.transportModes == [.train] })
        #expect(annotations.contains { $0.stop.name == "Masarykovo nádraží C" && $0.transportModes == [.tram] })
        #expect(annotations.contains { $0.stop.name == "Náměstí Republiky A" && $0.transportModes == [.bus] })
    }

    @Test("renders ferry stops separately from surface platforms")
    func rendersFerryStopsSeparatelyFromSurfacePlatforms() {
        let stop = ApiStop(
            id: "U6000",
            name: "Vyton",
            avgLatitude: 50.065,
            avgLongitude: 14.414,
            entrances: [],
            platforms: [
                ApiPlatform(
                    id: "U6000Z1P",
                    latitude: 50.0642,
                    longitude: 14.4132,
                    name: "Vyton pristav",
                    code: "P",
                    isMetro: false,
                    routes: [ApiRoute(id: "1", name: "P3")]
                ),
                ApiPlatform(
                    id: "U6000Z2P",
                    latitude: 50.0661,
                    longitude: 14.4154,
                    name: "Vyton",
                    code: "A",
                    isMetro: false,
                    routes: [ApiRoute(id: "2", name: "17")]
                ),
            ]
        )

        let annotations = buildRailStopMapAnnotations(from: [stop])
        let ferryAnnotation = annotations.first { $0.transportModes == [.ferry] }
        let transportAnnotation = annotations.first { $0.transportModes == [.tram] }

        #expect(annotations.count == 2)
        #expect(ferryAnnotation != nil)
        #expect(transportAnnotation != nil)
        #expect(ferryAnnotation?.coordinate.latitude == 50.0642)
        #expect(ferryAnnotation?.coordinate.longitude == 14.4132)
        #expect(transportAnnotation?.coordinate.latitude == 50.0661)
        #expect(transportAnnotation?.coordinate.longitude == 14.4154)
    }

    @Test("splits train routes away from surface routes on mixed platforms")
    func splitsTrainRoutesAwayFromSurfaceRoutesOnMixedPlatforms() {
        let stop = ApiStop(
            id: "U7000",
            name: "Praha-Vysocany",
            avgLatitude: 50.11,
            avgLongitude: 14.5,
            entrances: [],
            platforms: [
                ApiPlatform(
                    id: "U7000Z1P",
                    latitude: 50.1102,
                    longitude: 14.5004,
                    name: "Praha-Vysocany",
                    code: "1",
                    isMetro: false,
                    routes: [
                        ApiRoute(id: "1", name: "S1"),
                        ApiRoute(id: "2", name: "177"),
                    ]
                ),
            ]
        )

        let annotations = buildRailStopMapAnnotations(from: [stop])
        let trainAnnotation = annotations.first { $0.transportModes == [.train] }
        let surfaceAnnotation = annotations.first { $0.transportModes == [.bus] }

        #expect(annotations.count == 2)
        #expect(trainAnnotation?.stop.name == "Praha-Vysocany")
        #expect(trainAnnotation?.stop.platforms.count == 1)
        #expect(trainAnnotation?.stop.platforms.first?.routes.map(\.name) == ["S1"])
        #expect(surfaceAnnotation?.stop.name == "Praha-Vysocany 1")
        #expect(surfaceAnnotation?.stop.platforms.count == 1)
        #expect(surfaceAnnotation?.stop.platforms.first?.routes.map(\.name) == ["177"])
    }
}

@Suite("MetroDepartureRows", .tags(.api))
struct MetroDepartureRowsTests {
    private let baseDate = Date(timeIntervalSince1970: 1000)

    private func metroStop() -> ApiStop {
        ApiStop(
            id: "U1071",
            name: "Depo Hostivař",
            avgLatitude: 50.075,
            avgLongitude: 14.516,
            entrances: [],
            platforms: [
                ApiPlatform(
                    id: "U1071Z101P",
                    latitude: 50.075,
                    longitude: 14.516,
                    name: "Depo Hostivař",
                    code: "M1",
                    isMetro: true,
                    routes: [ApiRoute(id: "991", name: "A")]
                ),
                ApiPlatform(
                    id: "U1071Z102P",
                    latitude: 50.0751,
                    longitude: 14.5161,
                    name: "Depo Hostivař",
                    code: "M2",
                    isMetro: true,
                    routes: [ApiRoute(id: "991", name: "A")]
                ),
            ]
        )
    }

    private func departure(
        id: String,
        platformId: String,
        headsign: String,
        predictedOffsetMinutes: TimeInterval
    ) -> ApiDeparture {
        let predictedDate = baseDate.addingTimeInterval(predictedOffsetMinutes * 60)

        return ApiDeparture(
            id: id,
            platformId: platformId,
            platformCode: nil,
            headsign: headsign,
            departure: ApiDepartureDate(
                predicted: predictedDate,
                scheduled: predictedDate
            ),
            delay: 0,
            route: "A",
            routeId: "L991",
            isRealtime: nil
        )
    }

    @Test("collapses terminal metro departures with the same headsign across platforms")
    func collapsesTerminalMetroDepartures() {
        let rows = buildMetroDepartureRows(
            for: metroStop(),
            departures: [
                departure(
                    id: "first",
                    platformId: "U1071Z101P",
                    headsign: "Nemocnice Motol",
                    predictedOffsetMinutes: 12
                ),
                departure(
                    id: "second",
                    platformId: "U1071Z102P",
                    headsign: "Nemocnice Motol",
                    predictedOffsetMinutes: 4
                ),
                departure(
                    id: "third",
                    platformId: "U1071Z101P",
                    headsign: "Nemocnice Motol",
                    predictedOffsetMinutes: 20
                ),
            ]
        )

        #expect(rows?.count == 1)
        #expect(rows?.first?.headsign == "Nemocnice Motol")
        #expect(rows?.first?.platformId == "U1071Z102P")
        #expect(rows?.first?.departure == baseDate.addingTimeInterval(4 * 60))
        #expect(rows?.first?.nextDeparture == baseDate.addingTimeInterval(12 * 60))
    }

    @Test("keeps opposite metro directions as separate rows")
    func keepsOppositeMetroDirectionsSeparate() {
        let rows = buildMetroDepartureRows(
            for: metroStop(),
            departures: [
                departure(
                    id: "first",
                    platformId: "U1071Z101P",
                    headsign: "Nemocnice Motol",
                    predictedOffsetMinutes: 4
                ),
                departure(
                    id: "second",
                    platformId: "U1071Z102P",
                    headsign: "Depo Hostivař",
                    predictedOffsetMinutes: 6
                ),
            ]
        )

        #expect(rows?.count == 2)
        #expect(rows?.first?.headsign == "Nemocnice Motol")
        #expect(rows?.last?.headsign == "Depo Hostivař")
    }
}

@Suite("PlatformDepartureGroups", .tags(.api))
struct PlatformDepartureGroupsTests {
    private let baseDate = Date(timeIntervalSince1970: 1000)

    private func departure(
        id: String,
        platformId: String,
        route: String,
        predictedOffsetMinutes: TimeInterval
    ) -> ApiDeparture {
        let predictedDate = baseDate.addingTimeInterval(predictedOffsetMinutes * 60)

        return ApiDeparture(
            id: id,
            platformId: platformId,
            platformCode: nil,
            headsign: route,
            departure: ApiDepartureDate(
                predicted: predictedDate,
                scheduled: predictedDate
            ),
            delay: 0,
            route: route,
            routeId: nil,
            isRealtime: nil
        )
    }

    @Test("shows only relevant departures on split train and surface annotations")
    func showsOnlyRelevantDeparturesOnSplitTrainAndSurfaceAnnotations() throws {
        let stop = ApiStop(
            id: "U7000",
            name: "Praha-Vysocany",
            avgLatitude: 50.11,
            avgLongitude: 14.5,
            entrances: [],
            platforms: [
                ApiPlatform(
                    id: "U7000Z1P",
                    latitude: 50.1102,
                    longitude: 14.5004,
                    name: "Praha-Vysocany",
                    code: "1",
                    isMetro: false,
                    routes: [
                        ApiRoute(id: "1", name: "S1"),
                        ApiRoute(id: "2", name: "177"),
                    ]
                ),
            ]
        )

        let annotations = buildRailStopMapAnnotations(from: [stop])
        let departures = [
            departure(
                id: "train",
                platformId: "U7000Z1P",
                route: "S1",
                predictedOffsetMinutes: 2
            ),
            departure(
                id: "bus",
                platformId: "U7000Z1P",
                route: "177",
                predictedOffsetMinutes: 4
            ),
        ]

        let trainPlatform = annotations
            .first { $0.transportModes == [.train] }?
            .stop
            .platforms
            .first
        let surfacePlatform = annotations
            .first { $0.transportModes == [.bus] }?
            .stop
            .platforms
            .first
        let trainGroups = try buildPlatformDepartureGroups(
            for: #require(trainPlatform),
            departures: departures
        )
        let surfaceGroups = try buildPlatformDepartureGroups(
            for: #require(surfacePlatform),
            departures: departures
        )

        #expect(trainGroups?.count == 1)
        #expect(trainGroups?.first?.first?.route == "S1")
        #expect(surfaceGroups?.count == 1)
        #expect(surfaceGroups?.first?.first?.route == "177")
    }
}
