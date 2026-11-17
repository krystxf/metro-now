// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
@testable import metro_now
import Testing

@Suite(.tags(.utils))
struct FindClosestStopTests {
    private func makeStop(
        id: String,
        latitude: Double,
        longitude: Double
    ) -> ApiStop {
        ApiStop(
            id: id,
            name: "Stop \(id)",
            avgLatitude: latitude,
            avgLongitude: longitude,
            entrances: [],
            platforms: []
        )
    }

    @Test("returns the closest stop")
    func returnsClosestStop() {
        let location = CLLocation(latitude: 50.08, longitude: 14.43)
        let stops = [
            makeStop(id: "far", latitude: 50.1, longitude: 14.5),
            makeStop(id: "close", latitude: 50.081, longitude: 14.431),
            makeStop(id: "medium", latitude: 50.09, longitude: 14.45),
        ]

        let result = findClosestStop(to: location, stops: stops)
        #expect(result?.id == "close")
    }

    @Test("returns nil for empty stops array")
    func returnsNilForEmpty() {
        let location = CLLocation(latitude: 50.08, longitude: 14.43)

        let result = findClosestStop(to: location, stops: [])
        #expect(result == nil)
    }

    @Test("returns the only stop when there is one")
    func returnsSingleStop() {
        let location = CLLocation(latitude: 50.08, longitude: 14.43)
        let stop = makeStop(id: "only", latitude: 50.1, longitude: 14.5)

        let result = findClosestStop(to: location, stops: [stop])
        #expect(result?.id == "only")
    }

    @Test("getStopDistance returns distance using stop's distance method")
    func stopDistanceConsistency() {
        let location = CLLocation(latitude: 50.08, longitude: 14.43)
        let stop = makeStop(id: "test", latitude: 50.09, longitude: 14.44)

        let distance = getStopDistance(location, stop)
        #expect(distance > 0)
        // CoreLocation's distance computation can differ by sub-meter
        // amounts between successive calls; 1 mm is far below any
        // meaningful UI threshold and keeps the test deterministic.
        #expect(abs(distance - stop.distance(to: location)) < 0.001)
    }
}
