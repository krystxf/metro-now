//
//  PlatformListViewModel.swift
//  metro-now
//
//  Created by Kryštof Krátký on 18.05.2024.
//

import Foundation

// MARK: - Departures

struct Departures: Codable {
    let departures: [Departure1]
}

// MARK: - Departure

struct Departure1: Codable {
    let arrivalTimestamp, departureTimestamp: Timestamp
    let delay: Delay
    let route: Route
    let stop: Stop
    let trip: Trip

    enum CodingKeys: String, CodingKey {
        case arrivalTimestamp
        case departureTimestamp
        case delay, route, stop, trip
    }
}

// MARK: - Timestamp

struct Timestamp: Codable {
    let predicted, scheduled: String
}

// MARK: - Delay

struct Delay: Codable {
    let isAvailable: Bool
    let minutes, seconds: Int?

    enum CodingKeys: String, CodingKey {
        case isAvailable
        case minutes, seconds
    }
}

// MARK: - Route

struct Route: Codable {
    let shortName: String

    enum CodingKeys: String, CodingKey {
        case shortName
    }
}

// MARK: - Stop

struct Stop: Codable {
    let id: String
}

// MARK: - Trip

struct Trip: Codable {
    let headsign, id: String
    let isAtStop, isCanceled: Bool

    enum CodingKeys: String, CodingKey {
        case headsign, id
        case isAtStop
        case isCanceled
    }
}

enum FetchError:
    Error
{
    case InvalidURL
    case InvalidResponse
    case InvalidaData
}

final class PlatformListViewModel: ObservableObject {
    @Published var departures: [Departure1] = []

    func getData(gtfsIDs: [String]) async throws -> [Departure1] {
        let params = (gtfsIDs.map { "gtfsID=\($0)" }).joined(separator: "&")
        let endpoint = "http://localhost:3000/departures?\(params)"

        guard let url = URL(string: endpoint) else { throw FetchError.InvalidURL }

        let (data, response) = try await URLSession.shared.data(from: url)

        guard let respones = response as? HTTPURLResponse else {
            throw FetchError.InvalidResponse
        }

        do {
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            return try decoder.decode(Departures.self, from: data).departures
        }

        catch {
            throw FetchError.InvalidaData
        }
    }
}
