// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var appDelegate: AppDelegate
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @StateObject private var appNavigation = AppNavigationViewModel()
    @StateObject private var networkMonitor = NetworkMonitor()
    @StateObject private var locationModel = LocationViewModel()
    @State private var showNoInternetBanner = false

    @AppStorage(
        AppStorageKeys.hasSeenWelcomeScreen.rawValue
    ) var hasSeenWelcomeScreen = false
    @StateObject var stopsViewModel = StopsViewModel()
    @StateObject var favoritesViewModel = FavoritesViewModel()
    @State private var showWelcomeScreen: Bool = false
    @State private var showInfotexts: Bool = false
    @State private var infotextsPresentationDetent: PresentationDetent = .large
    @State private var showSettingsSheet = false
    @State private var showSearchSheet = false

    private var shouldPresentSearchAsSheet: Bool {
        horizontalSizeClass == .compact
    }

    private var tabSelection: Binding<AppTab> {
        Binding(
            get: { appNavigation.selectedTab },
            set: { newTab in
                guard shouldPresentSearchAsSheet, newTab == .search else {
                    appNavigation.selectedTab = newTab
                    return
                }

                showSearchSheet = true
            }
        )
    }

    private var searchPageView: some View {
        SearchPageView(
            location: locationModel.location
        )
        .environmentObject(locationModel)
        .environmentObject(stopsViewModel)
        .environmentObject(favoritesViewModel)
    }

    private var settingsPageView: some View {
        NavigationStack {
            SettingsPageView(showsCloseButton: true)
        }
    }

    var body: some View {
        ZStack {
            TabView(selection: tabSelection) {
                Tab("Departures", systemImage: "clock", value: .departures) {
                    NavigationStack {
                        ClosestStopPageView()
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
                                    Button(action: {
                                        showInfotexts = true
                                    }) {
                                        Label("Info", systemImage: "info.bubble")
                                    }
                                }
                            }
                    }
                    .environmentObject(locationModel)
                }

                Tab("Search", systemImage: "magnifyingglass", value: .search, role: .search) {
                    searchPageView
                }

                Tab("Favorites", systemImage: "star", value: .favorites) {
                    NavigationStack {
                        FavoritesPageView()
                    }
                    .environmentObject(locationModel)
                    .environmentObject(stopsViewModel)
                    .environmentObject(favoritesViewModel)
                }

                Tab("Map", systemImage: "map", value: .map) {
                    MapPageView()
                        .environmentObject(locationModel)
                        .environmentObject(stopsViewModel)
                        .environmentObject(favoritesViewModel)
                }
            }
            .tint(.primary)
            .sheet(
                isPresented: $showSettingsSheet
            ) {
                settingsPageView
                    .presentationDetents([.large])
            }
            .sheet(
                isPresented: $showSearchSheet,
                onDismiss: dismissSearchSheet
            ) {
                searchPageView
                    .presentationDetents([.medium, .large])
            }
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

            VStack {
                if showNoInternetBanner {
                    NoInternetBannerView()
                        .transition(getBannerTransition(.top))
                }
                Spacer()
            }
            .ignoresSafeArea(edges: .bottom)
        }
        .accessibilityIdentifier("screen.root")
        .onAppear {
            showWelcomeScreen = !hasSeenWelcomeScreen
            handleQuickAction(appDelegate.quickAction)
        }
        .onChange(of: appDelegate.quickAction) { _, action in
            handleQuickAction(action)
        }
        .onChange(of: showInfotexts) { _, isPresented in
            guard isPresented else { return }
            infotextsPresentationDetent = .large
        }
        .onChange(of: appNavigation.selectedTab) { _, newTab in
            guard shouldPresentSearchAsSheet, showSearchSheet, newTab != .search else {
                return
            }

            showSearchSheet = false
        }
        .onReceive(networkMonitor.$isConnected) { isConnected in
            setShowNoInternetBanner(!isConnected)
        }
        .environmentObject(appNavigation)
    }

    private func handleQuickAction(_ action: QuickAction?) {
        guard let action else { return }
        appDelegate.quickAction = nil
        switch action {
        case .map: appNavigation.selectedTab = .map
        case .favorites: appNavigation.selectedTab = .favorites
        }
    }

    private func setShowNoInternetBanner(_ value: Bool) {
        withAnimation {
            showNoInternetBanner = value
        }
    }

    private func dismissWelcomeScreen() {
        showWelcomeScreen = false
        hasSeenWelcomeScreen = true
    }

    private func dismissSearchSheet() {
        showSearchSheet = false
    }
}

#Preview {
    ContentView()
        .environmentObject(AppDelegate())
}
