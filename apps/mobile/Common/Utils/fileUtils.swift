//
//  metro-now
//
//  Created by Kryštof Krátký on 16.05.2024.
//

import Foundation

enum FileName: String {
    case METRO_STATIONS_FILE = "metro-stations"
    case METRO_ROUTES_FILE = "metro-routes"
}

func getFileExtension(_ filename: FileName) -> String {
    switch filename {
    case .METRO_ROUTES_FILE, .METRO_STATIONS_FILE:
        "geojson"
    }
}
