//
//  networkUtils.swift
//  metro-now
//
//  Created by Kryštof Krátký on 24.05.2024.
//

import Foundation
import SwiftUI

// let METRO_NOW_API = "https://api.metronow.dev"
let METRO_NOW_API = "http://localhost:3001"

enum FetchError:
    Error
{
    case InvalidURL
    case InvalidResponse
    case InvalidaData
}

typealias DeparturesByGtfsIDs = [String: [ApiDeparture]]

func getDeparturesByGtfsID(gtfsIDs: [String]) async throws -> DeparturesByGtfsIDs {
    let params = (gtfsIDs.map { "platform=\($0)" }).joined(separator: "&")
    let endpoint = "\(METRO_NOW_API)/metro?\(params)"
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
        return try decoder.decode(DeparturesByGtfsIDs.self, from: data)
    } catch {
        throw FetchError.InvalidaData
    }
}

func getDeparturesByGtfsID(_ gtfsID: String) async throws -> [ApiDeparture]? {
    let res = try await (getDeparturesByGtfsID(gtfsIDs: [gtfsID]))
    return res[gtfsID]
}
