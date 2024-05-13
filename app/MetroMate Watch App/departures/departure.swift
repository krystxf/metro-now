//
//  departure.swift
//  MetroMate
//
//  Created by Kryštof Krátký on 01.04.2024.
//

import Foundation

struct Departure: Codable, Identifiable, Hashable {
    let departureTimestamp: DepartureTimestamp
    let trip: DepartureTrip
    let delay: DepartureDelay?
    let stop: DepartureStop
    let route: DepartureRoute

    var id: String { trip.id }

    func hash(into hasher: inout Hasher) {
        hasher.combine(trip.id)
    }

    static func == (lhs: Departure, rhs: Departure) -> Bool {
        lhs.trip.id == rhs.trip.id
    }
}

struct DepartureStop: Codable {
    let id: String
}

struct DepartureRoute: Codable {
    let shortName: String
}

struct DepartureTimestamp: Codable {
    let predicted: String
    let scheduled: String
}

struct DepartureTrip: Codable {
    let headsign: String
    let id: String
}

struct DepartureDelay: Codable {
    let minutes: Int?
}
