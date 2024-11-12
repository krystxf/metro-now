// metro-now
// https://github.com/krystxf/metro-now

import Foundation

final class NetworkManager {
    static let shared = NetworkManager(
    )

    private init() {}

    func getMetroStops(
        completed: @escaping (Result<[ApiStop], FetchErrorNew>) -> Void
    ) {
        guard let url = URL(string: "\(ENDPOINT)/stop/all?metroOnly=true") else {
            completed(.failure(.invalidUrl))
            return
        }

        let task = URLSession.shared.dataTask(
            with: URLRequest(url: url)
        ) {
            data, response, error in

            if let _ = error {
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

    func getAllStops(
        completed: @escaping (Result<[ApiStop], FetchErrorNew>) -> Void
    ) {
        guard let url = URL(string: "\(ENDPOINT)/stop/all") else {
            completed(.failure(.invalidUrl))
            return
        }

        let task = URLSession.shared.dataTask(
            with: URLRequest(url: url)
        ) {
            data, response, error in

            if let _ = error {
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
        stopIds: [String], platformIds: [String], completed: @escaping (Result<[ApiDeparture], FetchErrorNew>) -> Void
    ) {
        guard let baseUrl = URL(string: "\(ENDPOINT)/departure") else {
            completed(.failure(.invalidUrl))
            return
        }

        let platformsQueryParams: [URLQueryItem] = platformIds.map {
            URLQueryItem(name: "platform[]", value: $0)
        }
        let stopsQueryParams: [URLQueryItem] = stopIds.map {
            URLQueryItem(name: "stop[]", value: $0)
        }

        let url = baseUrl
            .appending(queryItems: stopsQueryParams + platformsQueryParams + [
                URLQueryItem(name: "metroOnly", value: "true"),
            ])

        let task = URLSession.shared.dataTask(
            with: URLRequest(url: url)
        ) {
            data, response, error in

            if let _ = error {
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
