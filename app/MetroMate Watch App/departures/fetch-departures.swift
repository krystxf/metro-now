//
//  fetch-departures.swift
//  MetroMate
//
//  Created by Kryštof Krátký on 01.04.2024.
//

import Foundation

let ENDPOINT_URL = "https://api.golemio.cz/v2/pid/departureboards"
let REQUEST_PARAMETERS = [
    URLQueryItem(name: "includeMetroTrains", value: "true"),
    URLQueryItem(name: "preferredTimezone", value: "Europe_Prague"),
    URLQueryItem(name: "mode", value: "departures"),
    URLQueryItem(name: "order", value: "real"),
    URLQueryItem(name: "filter", value: "none"),
    URLQueryItem(name: "minutesBefore", value: String(2)),
    URLQueryItem(name: "minutesAfter", value: String(360))
    
]

struct DepartureBoardResponse: Codable {
    let departures: [Departure]
}

func fetchDepartureBoardData(
    platformIDs: [String], // gtfsIDs
    completion: @escaping (Result<[Departure], Error>) -> Void
) {
    guard let baseURL = URL(string: ENDPOINT_URL) else {
        print("Invalid base URL")
        return
    }

    var components = URLComponents(
        url: baseURL,
        resolvingAgainstBaseURL: false
    )
    components?.queryItems = REQUEST_PARAMETERS + platformIDs.map { platformID in
        URLQueryItem(name: "ids[]", value: platformID)
    }

    guard let url = components?.url else {
        print("Failed to construct URL")
        return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue(
        GOLEMIO_API_KEY,
        forHTTPHeaderField: "X-Access-Token"
    )

    let task = URLSession.shared.dataTask(with: request) { data, response, error in
        if let error = error {
            completion(.failure(error))
            return
        }

        guard let httpResponse = response as? HTTPURLResponse,
              (200 ... 299).contains(httpResponse.statusCode)
        else {
            completion(
                .failure(
                    NSError(
                        domain: "InvalidResponse",
                        code: 0,
                        userInfo: nil
                    )
                )
            )
            return
        }

        if let data = data {
            do {
                let decoder = JSONDecoder()
                decoder.keyDecodingStrategy = .convertFromSnakeCase

                let decodedResponse = try decoder.decode(DepartureBoardResponse.self, from: data)

                completion(
                    .success(decodedResponse.departures)
                )
            } catch {
                completion(
                    .failure(error)
                )
            }
        }
    }
    task.resume()
}
