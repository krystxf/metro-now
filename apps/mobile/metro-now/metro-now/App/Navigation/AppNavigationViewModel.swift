// metro-now
// https://github.com/krystxf/metro-now

import Foundation
import SwiftUI

enum AppTab: Hashable {
    case departures
    case search
    case favorites
    case map
}

struct MapStopSelection: Identifiable {
    let id = UUID()
    let stop: ApiStop
}

final class AppNavigationViewModel: ObservableObject {
    @Published var selectedTab: AppTab = .departures
    @Published private(set) var pendingMapSelection: MapStopSelection?

    func openMap(for stop: ApiStop) {
        pendingMapSelection = MapStopSelection(stop: stop)
        selectedTab = .map
    }

    func consumePendingMapSelection(_ selectionId: UUID) {
        guard pendingMapSelection?.id == selectionId else {
            return
        }

        pendingMapSelection = nil
    }
}
