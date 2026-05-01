// metro-now
// https://github.com/krystxf/metro-now

import Foundation

enum RoutePreviewPlatformState: Equatable {
    case passed
    case current
    case upcoming
}

struct RoutePreviewPlatformItem: Identifiable {
    let platform: ApiRoutePlatform
    let state: RoutePreviewPlatformState

    var id: String {
        platform.id
    }
}
