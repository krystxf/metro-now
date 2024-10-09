//
//  departure.swift
//  metro-now
//
//  Created by Kryštof Krátký on 22.07.2024.
//

import Foundation

struct ApiDeparture: Codable {
    let departure: Date
    let line: String
    let heading: String
    let platform: String
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

    return try await fetch(endpoint)
}

func getDepartures(stations: [String] = [], gtfsIDs: [String] = []) async throws -> [ApiDeparture] {
    if stations.count == 0, gtfsIDs.count == 0 {
        print("No station & No GtfsID")
        return []
    }
    let platformParam = (gtfsIDs.map { "platform=\($0)" }).joined(separator: "&")
    let stationParam = (stations.map { "station=\($0)" }).joined(separator: "&")
    let endpoint = "\(METRO_NOW_API)/metro?\(platformParam)&\(stationParam)"

    return try await fetch(endpoint)
}
