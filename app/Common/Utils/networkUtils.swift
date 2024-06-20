//
//  networkUtils.swift
//  metro-now
//
//  Created by Kryštof Krátký on 24.05.2024.
//

import Foundation
import SwiftUI

let METRO_NOW_API = "https://api.metronow.dev"

enum FetchError:
    Error
{
    case InvalidURL
    case InvalidResponse
    case InvalidaData
}

typealias GroupedDepartures = [String: [ApiDeparture]]

enum GroupBy: String {
    case platform
    case heading
}

func getDepartures(stations: [String] = [], gtfsIDs: [String] = [], groupBy: GroupBy) async throws -> GroupedDepartures {
    if stations.count == 0, gtfsIDs.count == 0 {
        print("No station & No GtfsID")
        return [:]
    }

    let platformParam = (gtfsIDs.map { "platform=\($0)" }).joined(separator: "&")
    let stationParam = (stations.map { "station=\($0)" }).joined(separator: "&")
    let endpoint = "\(METRO_NOW_API)/metro?\(platformParam)&\(stationParam)&groupBy=\(groupBy.rawValue)"
    print(endpoint)
    guard let url = URL(string: endpoint) else { throw FetchError.InvalidURL }
    let (data, response) = try await URLSession.shared.data(from: url)

    guard let response = response as? HTTPURLResponse, response.statusCode == 200 else {
        print("Response not 200")
        return [:]
    }

    do {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601

        return try decoder.decode(GroupedDepartures.self, from: data)

    } catch {
        throw FetchError.InvalidaData
    }
}

func getDepartures(stations: [String] = [], gtfsIDs: [String] = []) async throws -> [ApiDeparture] {
    if stations.count == 0, gtfsIDs.count == 0 {
        print("No station & No GtfsID")
        return []
    }
    let platformParam = (gtfsIDs.map { "platform=\($0)" }).joined(separator: "&")
    let stationParam = (stations.map { "station=\($0)" }).joined(separator: "&")
    let endpoint = "\(METRO_NOW_API)/metro?\(platformParam)&\(stationParam)"
    print(endpoint)
    guard let url = URL(string: endpoint) else { throw FetchError.InvalidURL }

    let (data, response) = try await URLSession.shared.data(from: url)

    guard let response = response as? HTTPURLResponse, response.statusCode == 200 else {
        print("Response not 200")
        return []
    }

    do {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601

        return try decoder.decode([ApiDeparture].self, from: data)

    } catch {
        throw FetchError.InvalidaData
    }
}
