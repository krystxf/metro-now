//
//  stationsJSONManager.swift
//  metro-now
//
//  Created by Kryštof Krátký on 15.05.2024.
//

import Foundation

struct Station: Codable {
    let name: String
    let avgLat, avgLon: Double
    let platforms: [Platform]
}

struct Platform: Codable {
    let gtfsID, name, direction: String?

    enum CodingKeys: String, CodingKey {
        case gtfsID
        case name, direction
    }
}

func parseStationsJSON() -> [Station]? {
    if let path = Bundle.main.path(forResource: "stations", ofType: "json") {
        do {
            let data = try Data(contentsOf: URL(fileURLWithPath: path))
            let stations = try JSONDecoder().decode([Station].self, from: data)
            return stations
        } catch {
            print("Error parsing JSON: \(error)")
        }
    } else {
        print("File not found")
    }
    return nil
}
