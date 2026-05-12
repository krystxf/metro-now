// metro-now
// https://github.com/krystxf/metro-now

import Foundation
@_spi(Experimental) import MapboxMaps

func clearAllAppCaches(stopsViewModel: StopsViewModel? = nil) async {
    DiskCache.invalidateAll()
    URLCache.shared.removeAllCachedResponses()

    try? await clearGraphQLCache()

    await withCheckedContinuation { continuation in
        MapboxMap.clearData { error in
            if let error {
                print("[CacheCleaner] Mapbox clearData error: \(error)")
            }
            continuation.resume()
        }
    }

    await stopsViewModel?.refresh()
}
