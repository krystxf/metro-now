//
//  Author: Kryštof Krátký
//

import Foundation

struct ApiDeparture: Codable {
    let departureTimestamp: DepartureTimestamp
    let route: Route
    let trip: Trip
}

struct DepartureTimestamp: Codable {
    let predicted: Date
}

struct Route: Codable {
    let shortName: String
}

struct Trip: Codable {
    let headsign: String
}
