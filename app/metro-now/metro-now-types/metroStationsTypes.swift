//
//  Created by Kryštof Krátký on 16.05.2024.
//

import Foundation

struct MetroStationsGeoJSON: Codable {
    let type: String
    let features: [MetroStationsGeoJSONFeature]
}

struct MetroStationsGeoJSONFeature: Codable {
    let type: String
    let geometry: MetroStationsGeoJSONFeatureGeometry
    let properties: MetroStationsGeoJSONFeatureGeometryProperties
}

struct MetroStationsGeoJSONFeatureGeometry: Codable {
    let type: String
    let coordinates: [Double]
}

struct MetroStationsGeoJSONFeatureGeometryProperties: Codable {
    let name: String
    let platforms: [MetroStationsGeoJSONFeatureGeometryPropertiesPlatform]
}

struct MetroStationsGeoJSONFeatureGeometryPropertiesPlatform: Codable, Hashable {
    let gtfsID: String?
    let name: String?
    let direction: String?
}
