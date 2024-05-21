//
//  metro-now
//
//  Created by Kryštof Krátký on 16.05.2024.
//

import Foundation

struct MetroRoutesGeoJSON: Codable {
    let type: String
    let features: [MetroRoutesGeoJSONFeature]
}

struct MetroRoutesGeoJSONFeature: Codable {
    let type: String
    let geometry: MetroRoutesGeoJSONFeatureGeometry
    let properties: MetroRoutesGeoJSONFeatureGeometryProperties
}

struct MetroRoutesGeoJSONFeatureGeometry: Codable {
    let type: String
    let coordinates: [[[Double]]]
}

struct MetroRoutesGeoJSONFeatureGeometryProperties: Codable {
    let objectid: Int?
    let routeShortName: String
    let routeID, routeLongName, routeType: String?
    let routeURL: String?
    let routeColor, isNight, isRegional, isSubstituteTransport: String?
    let validity: String?
    let shapeLength: Double?
}
