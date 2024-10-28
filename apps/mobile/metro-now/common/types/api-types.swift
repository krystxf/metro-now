// metro-now
// https://github.com/krystxf/metro-now

import Foundation

struct ApiStop: Codable {
    let id, name: String
    let avgLatitude, avgLongitude: Double
    let platforms: [ApiPlatform]
}

struct ApiPlatform: Codable {
    let id: String
    let latitude, longitude: Double
    let name: String
    let isMetro: Bool
    let routes: [ApiRoute]
}

struct ApiRoute: Codable {
    let id, name: String
}

struct ApiDepartureDate: Codable {
    let predicted: Date
    let scheduled: Date
}

struct ApiDeparture: Codable {
    let platformId: String
    let headsign: String

    let departure: ApiDepartureDate
    let delay: Int

    let route: String
}
