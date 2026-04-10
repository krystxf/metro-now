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

        let platformQuery = platformIds.map { "platform[]=\($0)" }.joined(separator: "&")
        let url = "\(API_URL)/v2/departure?\(platformQuery)&limit=8&minutesBefore=1&minutesAfter=120"

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        return await withCheckedContinuation { continuation in
            apiSession.request(url, method: .get)
                .validate()
                .responseDecodable(of: [ApiDeparture].self, decoder: decoder) { response in
                    switch response.result {
                    case let .success(departures):
                        continuation.resume(returning: departures)
                    case .failure:
                        continuation.resume(returning: [])
                    }
                }
        }
    }

    static func currentLocation() -> CLLocation? {
        CLLocationManager().location
    }
}
