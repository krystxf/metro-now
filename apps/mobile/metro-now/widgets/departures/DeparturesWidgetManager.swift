// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation

enum DeparturesWidgetManager {
    static func fetchMetroStops() async -> [ApiStop]? {
        await fetchStopsWithCache(metroOnly: true)
    }

    static func fetchDepartures(platformIds: [String]) async -> [ApiDeparture] {
        guard !platformIds.isEmpty else { return [] }

        do {
            return try await fetchDeparturesGraphQL(
                stopIds: [],
                platformIds: platformIds,
                limit: 8,
                metroOnly: nil,
                minutesBefore: 1,
                minutesAfter: 120
            )
        } catch {
            return []
        }
    }

    static func currentLocation() -> CLLocation? {
        CLLocationManager().location
    }
}
