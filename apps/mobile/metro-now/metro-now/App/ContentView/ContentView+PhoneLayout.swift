// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

extension ContentView {
    var phoneLayout: some View {
        TabView(selection: $displayedPhoneTab) {
            Tab(value: AppTab.departures) {
                departuresPageView
            } label: {
                tabLabel(
                    "Departures",
                    systemImage: "clock",
                    isSelected: displayedPhoneTab == .departures
                )
            }

            Tab(value: AppTab.favorites) {
                favoritesPageView
            } label: {
                tabLabel(
                    "Favorites",
                    systemImage: "star",
                    isSelected: displayedPhoneTab == .favorites
                )
            }

            Tab(value: AppTab.map) {
                mapPageView
            } label: {
                tabLabel(
                    "Map",
                    systemImage: "map",
                    isSelected: displayedPhoneTab == .map
                )
            }

            Tab(value: AppTab.search, role: .search) {
                if shouldPresentSearchAsSheet {
                    Color.clear
                } else {
                    searchPageView()
                }
            } label: {
                tabLabel(
                    "Search",
                    systemImage: "magnifyingglass",
                    isSelected: false
                )
            }
        }
        .tint(.primary)
    }
}
