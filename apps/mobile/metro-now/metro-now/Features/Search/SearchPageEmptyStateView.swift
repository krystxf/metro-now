// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SearchPageEmptyStateView: View {
    let vehicleTypeFilter: SearchPageVehicleTypeFilter

    private var title: String {
        "Search \(vehicleTypeFilter.title) Stops"
    }

    private var description: String {
        if vehicleTypeFilter == .all {
            return "Type a stop name to search metro, tram, bus, train, ferry, and funicular stops."
        }
        return "Type a stop name to search \(vehicleTypeFilter.title.lowercased()) stops."
    }

    var body: some View {
        ContentUnavailableView(
            title,
            systemImage: vehicleTypeFilter.systemImage,
            description: Text(description)
        )
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview("All") {
    SearchPageEmptyStateView(vehicleTypeFilter: .all)
}

#Preview("Metro") {
    SearchPageEmptyStateView(vehicleTypeFilter: .metro)
}
