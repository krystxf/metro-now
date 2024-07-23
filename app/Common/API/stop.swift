//
//  stop.swift
//  metro-now
//
//  Created by Kryštof Krátký on 22.07.2024.
//

import Foundation

struct Stop: Codable {
    let id: String
    let name: String
    let latitude, longitude: Double
    let routes: [Route]
}

struct Route: Codable {
    let id: String
    let name: String
}
