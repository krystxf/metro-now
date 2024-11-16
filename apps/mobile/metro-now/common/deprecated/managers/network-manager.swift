// metro-now
// https://github.com/krystxf/metro-now

import Foundation

enum VehicleType: String {
    case METRO = "metro"
    case ALL = "all"
}

final class NetworkManager {
    static let shared = NetworkManager()

    private init() {}

    func getStops(
        metroOnly: Bool,
        completed: @escaping (Result<[ApiStop], FetchErrorNew>) -> Void
    ) {
        guard let url = URL(string: "\(ENDPOINT)/v1/stop/all?metroOnly=\(metroOnly)") else {
            completed(.failure(.invalidUrl))
            return
        }

        print("GET")
        print(url)

        let task = URLSession.shared.dataTask(
            with: URLRequest(url: url)
        ) {
            data,
                response,
                error in

            if error != nil {
                completed(.failure(.general))
                return
            }

            guard let response = response as? HTTPURLResponse, response.statusCode == 200 else {
                completed(.failure(.invalidResponse))
                return
            }

            guard let data else {
                completed(.failure(.invalidData))
                return
            }

            do {
                let decoder = JSONDecoder()
                let decodedResponse = try decoder.decode([ApiStop].self, from: data)
                completed(.success(decodedResponse))
                return
            } catch {
                completed(.failure(.invalidData))
                return
            }
        }

        task.resume()
    }

    func getDepartures(
        includeVehicle: VehicleType,
        excludeMetro: Bool,
        stopIds: [String],
        platformIds: [String],
        completed: @escaping (Result<[ApiDeparture], FetchErrorNew>) -> Void
    ) {
        guard let baseUrl = URL(string: "\(ENDPOINT)/v2/departure") else {
            completed(.failure(.invalidUrl))
            return
        }

        let platformsQueryParams: [URLQueryItem] = platformIds.map {
            URLQueryItem(name: "platform[]", value: $0)
        }
        let stopsQueryParams: [URLQueryItem] = stopIds.map {
            URLQueryItem(name: "stop[]", value: $0)
        }
        let vehicleQueryParams: [URLQueryItem] =
            [URLQueryItem(name: "vehicleType", value: includeVehicle.rawValue)]
                + (excludeMetro ? [URLQueryItem(name: "excludeVehicleType", value: "metro")] : [])

        let url = baseUrl.appending(
            queryItems: stopsQueryParams + platformsQueryParams + vehicleQueryParams + [
                URLQueryItem(name: "limit", value: String(4)),
            ]
        )

        print("GET")
        print(url)

        let task = URLSession.shared.dataTask(
            with: URLRequest(url: url)
        ) { data, response, error in

            if error != nil {
                completed(.failure(.general))
                return
            }

            guard let response = response as? HTTPURLResponse, response.statusCode == 200 else {
                completed(.failure(.invalidResponse))
                return
            }

            guard let data else {
                completed(.failure(.invalidData))
                return
            }

            do {
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601

                let decodedResponse = try decoder.decode(
                    [ApiDeparture].self,
                    from: data
                )

                completed(.success(decodedResponse))

                return
            } catch {
                completed(.failure(.invalidData))
                return
            }
        }

        task.resume()
    }
}

enum FetchErrorNew: Error {
    case invalidUrl
    case invalidResponse
    case invalidData
    case general
}
