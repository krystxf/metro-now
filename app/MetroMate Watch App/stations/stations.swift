//
//  stations.swift
//  MetroMate Watch App
//
//  Created by Kryštof Krátký on 31.03.2024.
//

import Foundation

struct Station: Codable {
    let name: String
    let avgLat, avgLon: Double
    /**
     * there are three possible lengths of stops array
     * 1 - final station
     * 2 - normal station
     * 4 - transit station (Můstek, Muzeum, Florenc)
     */
    let platforms: [Platform]

    static let allStations: [Station] = Bundle.main.decode(file: "stations")
}

struct Platform: Codable, Identifiable {
    var id: String { gtfsId }

    let gtfsId: String
    let name: String // "A" / "B" / "C"
    let direction: String
}

extension Bundle {
    func decode<T: Decodable>(file: String) -> T {
        guard let url = url(forResource: file, withExtension: "json") else {
            fatalError("Could not find \(file) file")
        }

        guard let data = try? Data(contentsOf: url) else {
            fatalError("Could not load \(file) file")
        }

        let decoder = JSONDecoder()

        guard let loadedData = try? decoder.decode(T.self, from: data) else {
            fatalError("Could not decode \(file) file")
        }

        return loadedData
    }
}
