// metro-now
// https://github.com/krystxf/metro-now

import Alamofire
import CoreLocation

enum DeparturesWidgetManager {
    static func fetchMetroStops() async -> [ApiStop]? {
        await withCheckedContinuation { continuation in
            apiSession.request(
                "\(API_URL)/v1/stop/all",
                method: .get,
                parameters: ["metroOnly": "true"]
            )
            .validate()
            .responseDecodable(of: [ApiStop].self) { response in
                switch response.result {
                case let .success(stops):
                    continuation.resume(returning: stops)
                case .failure:
                    continuation.resume(returning: nil)
                }
            }
        }
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
