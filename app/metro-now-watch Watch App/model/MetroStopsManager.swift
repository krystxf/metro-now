//
//  MetroStopsManager.swift
//  metro-now
//
//  Created by Kryštof Krátký on 29.09.2024.
//

import SwiftUI

struct Stop: Codable {
    var id: String
    var name: String
    var avgLatitude, avgLongitude: Double
    var platforms: [Platform]
}

struct Platform: Codable {
    var id: String
    var name: String
    var latitude, longitude: Double
    var routes: [Route]
}

struct Route: Codable {
    var id: String
    var name: String
}

class StopManager: ObservableObject {
    @Published var stops = [Stop]()
    @Published var closestStop: Stop? = nil
}

func getAllMetroStops() async -> [Stop] {
    let METRO_NOW_API = "http://localhost:3001"
    print("Fetching data")
    guard let url = URL(string: "http://localhost:3001/stop/all?metroOnly=true") else {
        print("Invalid URL in getAllMetroStops")
        return []
    }
    print("URL created")

    do {
        let (data, _) = try await URLSession.shared.data(from: url)
        print("Fetched data")

        let decodedResponse = try? JSONDecoder().decode([Stop].self, from: data)
        guard let decodedResponse else {
            print("Error parsing data")
            return []
        }

        return decodedResponse
    } catch {
        print("Invalid data")
    }

    return []
}
