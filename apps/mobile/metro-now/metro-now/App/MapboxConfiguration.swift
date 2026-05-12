// metro-now
// https://github.com/krystxf/metro-now

import Foundation
import MapboxMaps

enum MapboxConfiguration {
    private static let environmentKey = "MAPBOX_ACCESS_TOKEN"
    private static let infoPlistKeys = ["MAPBOX_ACCESS_TOKEN", "MBXAccessToken"]

    static func applyAccessTokenIfAvailable() {
        guard let token = infoPlistAccessToken ?? environmentAccessToken else {
            assertionFailure("Mapbox access token not found. Add it to Secrets.xcconfig.")
            return
        }
        MapboxOptions.accessToken = token
    }

    private static var infoPlistAccessToken: String? {
        for key in infoPlistKeys {
            if let value = Bundle.main.object(forInfoDictionaryKey: key) as? String,
               !value.isEmpty
            {
                return value
            }
        }

        return nil
    }

    private static var environmentAccessToken: String? {
        guard let value = ProcessInfo.processInfo.environment[environmentKey],
              !value.isEmpty
        else {
            return nil
        }

        return value
    }
}
