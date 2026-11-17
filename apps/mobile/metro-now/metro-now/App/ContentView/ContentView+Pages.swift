// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

extension ContentView {
    func searchPageView(showsCloseButton: Bool = false) -> some View {
        SearchPageView(showsCloseButton: showsCloseButton)
            .environmentObject(locationModel)
            .environmentObject(stopsViewModel)
            .environmentObject(favoritesViewModel)
            .safeAreaPadding(.horizontal, tabletSidebarContentInset)
            .safeAreaPadding(.top, tabletSidebarContentInset)
    }

    var settingsPageView: some View {
        NavigationStack {
            SettingsPageView(showsCloseButton: true)
        }
        .environmentObject(stopsViewModel)
    }

    var departuresPageView: some View {
        NavigationStack {
            ClosestStopPageView(viewModel: closestStopViewModel)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button {
                            showSettingsSheet = true
                        } label: {
                            Label("Settings", systemImage: "gearshape")
                        }
                        .accessibilityIdentifier("button.open-settings")
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            showInfotexts = true
                        } label: {
                            Label("Info", systemImage: "info.bubble")
                        }
                    }
                }
        }
        .environmentObject(locationModel)
        .safeAreaPadding(.horizontal, tabletSidebarContentInset)
        .safeAreaPadding(.top, tabletSidebarContentInset)
    }

    var favoritesPageView: some View {
        NavigationStack {
            FavoritesPageView()
        }
        .environmentObject(locationModel)
        .environmentObject(stopsViewModel)
        .environmentObject(favoritesViewModel)
        .safeAreaPadding(.horizontal, tabletSidebarContentInset)
        .safeAreaPadding(.top, tabletSidebarContentInset)
    }

    var mapPageView: some View {
        MapPageView(isAlwaysVisible: isTabletLayout)
            .environmentObject(locationModel)
            .environmentObject(stopsViewModel)
            .environmentObject(favoritesViewModel)
    }

    func tabLabel(
        _ titleKey: LocalizedStringKey,
        systemImage: String,
        isSelected: Bool
    ) -> some View {
        Label(titleKey, systemImage: systemImage)
            .environment(\.symbolVariants, isSelected ? .fill : .none)
    }

    func applyingNonSearchSheets(to content: some View) -> some View {
        content
            .sheet(isPresented: $showInfotexts) {
                InfotextsPageView()
                    .presentationDetents(
                        [.medium, .large],
                        selection: $infotextsPresentationDetent
                    )
            }
            .sheet(
                isPresented: $showWelcomeScreen,
                onDismiss: dismissWelcomeScreen
            ) {
                WelcomePageView()
                    .presentationDetents([.medium])
            }
    }
}
