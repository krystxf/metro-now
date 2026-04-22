// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
@testable import metro_now
import Testing

@Suite(.tags(.api))
struct ApiStopDistanceTests {
    private func makeEntrance(
        id: String,
        latitude: Double,
        longitude: Double
    ) -> ApiStopEntrance {
        ApiStopEntrance(
            id: id,
            name: "Entrance \(id)",
            latitude: latitude,
            longitude: longitude
        )
    }

    private func makePlatform(
        id: String,
        latitude: Double,
        longitude: Double,
        isMetro: Bool
    ) -> ApiPlatform {
        ApiPlatform(
            id: id,
            latitude: latitude,
            longitude: longitude,
            name: "Platform \(id)",
            code: nil,
            isMetro: isMetro,
            routes: []
        )
    }

    private func makeStop(
        id: String = "U1",
        avgLatitude: Double,
        avgLongitude: Double,
        entrances: [ApiStopEntrance] = [],
        platforms: [ApiPlatform] = []
    ) -> ApiStop {
        ApiStop(
            id: id,
            name: "Stop \(id)",
            avgLatitude: avgLatitude,
            avgLongitude: avgLongitude,
            entrances: entrances,
            platforms: platforms
        )
    }

    // MARK: - entrance-driven distance

    @Test("distance picks the nearest entrance when entrances are present")
    func distanceUsesNearestEntrance() {
        let location = CLLocation(latitude: 50.0800, longitude: 14.4300)
        // Nearest entrance is ~11 m from the location; the others are farther.
        let stop = makeStop(
            avgLatitude: 50.0900, // far-away centroid on purpose
            avgLongitude: 14.4500,
            entrances: [
                makeEntrance(id: "far", latitude: 50.0900, longitude: 14.4500),
                makeEntrance(id: "near", latitude: 50.0801, longitude: 14.4300),
                makeEntrance(id: "mid", latitude: 50.0850, longitude: 14.4400),
            ]
        )

        let distance = stop.distance(to: location)
        let expected = CLLocation(latitude: 50.0801, longitude: 14.4300)
            .distance(from: location)

        #expect(abs(distance - expected) < 0.001)
    }

    @Test("distance ignores the avgLat/avgLon centroid when entrances are present")
    func distanceIgnoresCentroidWhenEntrancesExist() {
        let location = CLLocation(latitude: 50.0800, longitude: 14.4300)
        let stop = makeStop(
            avgLatitude: 50.0800, // centroid exactly at the user
            avgLongitude: 14.4300,
            entrances: [
                makeEntrance(id: "e1", latitude: 50.0900, longitude: 14.4400),
            ]
        )
        let centroidFallback = makeStop(
            avgLatitude: 50.0800,
            avgLongitude: 14.4300
        )

        // Entrance-based distance must be strictly larger than the 0-m centroid
        // fallback, proving the entrance branch is exercised instead.
        #expect(stop.distance(to: location) > centroidFallback.distance(to: location))
    }

    // MARK: - metro-platform-driven distance

    @Test("distance falls back to metro platforms when entrances are empty")
    func distanceUsesMetroPlatforms() {
        let location = CLLocation(latitude: 50.0800, longitude: 14.4300)
        let stop = makeStop(
            avgLatitude: 50.0900, // centroid we don't want used
            avgLongitude: 14.4500,
            entrances: [],
            platforms: [
                makePlatform(id: "bus", latitude: 50.0900, longitude: 14.4500, isMetro: false),
                makePlatform(id: "metro1", latitude: 50.0801, longitude: 14.4300, isMetro: true),
                makePlatform(id: "metro2", latitude: 50.0850, longitude: 14.4400, isMetro: true),
            ]
        )

        let distance = stop.distance(to: location)
        let expected = CLLocation(latitude: 50.0801, longitude: 14.4300)
            .distance(from: location)

        #expect(abs(distance - expected) < 0.001)
    }

    @Test("distance ignores non-metro platforms in the metro branch")
    func distanceIgnoresNonMetroPlatforms() {
        let location = CLLocation(latitude: 50.0800, longitude: 14.4300)
        let stop = makeStop(
            avgLatitude: 50.0800,
            avgLongitude: 14.4300,
            entrances: [],
            platforms: [
                // Non-metro platform sitting right on the user — would win if
                // isMetro were not checked.
                makePlatform(id: "bus", latitude: 50.0800, longitude: 14.4300, isMetro: false),
                // Metro platform a few hundred metres away.
                makePlatform(id: "metro1", latitude: 50.0850, longitude: 14.4350, isMetro: true),
            ]
        )

        let distance = stop.distance(to: location)

        #expect(distance > 100, "metro platform ~500 m away must dominate the non-metro match at the user's location")
    }

    // MARK: - fallback to avgLat/avgLon

    @Test("distance falls back to centroid when there are no entrances or metro platforms")
    func distanceFallsBackToCentroid() {
        let location = CLLocation(latitude: 50.0800, longitude: 14.4300)
        let stop = makeStop(
            avgLatitude: 50.0810,
            avgLongitude: 14.4310,
            entrances: [],
            platforms: [
                // Only non-metro platforms: the metro branch returns empty and
                // the fallback centroid must be used.
                makePlatform(id: "bus", latitude: 50.0900, longitude: 14.4500, isMetro: false),
            ]
        )

        let distance = stop.distance(to: location)
        let expected = CLLocation(latitude: 50.0810, longitude: 14.4310)
            .distance(from: location)

        #expect(abs(distance - expected) < 0.001)
    }

    // MARK: - findClosestStop picks the entrance-aware nearest stop

    @Test("findClosestStop picks the stop whose entrance is nearest, not its centroid")
    func findClosestStopUsesEntranceDistance() {
        let location = CLLocation(latitude: 50.0800, longitude: 14.4300)
        // `A` has a centroid far from the user but an entrance very close.
        // `B` has a centroid close to the user but no entrances/metro platforms.
        let stopA = makeStop(
            id: "A",
            avgLatitude: 50.1000,
            avgLongitude: 14.5000,
            entrances: [
                makeEntrance(id: "A1", latitude: 50.0801, longitude: 14.4300),
            ]
        )
        let stopB = makeStop(
            id: "B",
            avgLatitude: 50.0810,
            avgLongitude: 14.4310
        )

        let result = findClosestStop(to: location, stops: [stopA, stopB])

        #expect(result?.id == "A")
    }
}
