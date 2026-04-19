// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import SwiftUI

extension StopsViewModel {
    convenience init(previewStops: [ApiStop]) {
        self.init(initialStops: previewStops, shouldRefresh: false)
    }
}

extension LocationViewModel {
    convenience init(
        previewLocation: CLLocation?,
        authorizationStatus: CLAuthorizationStatus = .authorizedWhenInUse
    ) {
        self.init(
            initialLocation: previewLocation,
            initialAuthorizationStatus: authorizationStatus,
            shouldStartUpdates: false
        )
    }
}

extension FavoritesViewModel {
    convenience init(previewFavoriteStopIds: [String]) {
        self.init(initialFavoriteStopIds: previewFavoriteStopIds)
    }
}

extension SearchPageDetailViewModel {
    convenience init(
        previewPlatformIds: [String],
        departures: [ApiDeparture]
    ) {
        self.init(
            platformIds: previewPlatformIds,
            initialDepartures: departures,
            shouldRefresh: false
        )
    }
}

extension ClosestStopPageViewModel {
    convenience init(
        previewLocation: CLLocation,
        nearbyStops: [ApiStop],
        departures: [ApiDeparture]
    ) {
        self.init(
            initialLocation: previewLocation,
            initialNearbyStops: nearbyStops,
            initialDepartures: departures,
            shouldRefresh: false
        )
    }
}

struct PreviewNavigationContainer<Content: View>: View {
    @ViewBuilder let content: () -> Content

    var body: some View {
        NavigationStack {
            content()
        }
    }
}
