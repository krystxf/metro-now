// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

enum AppTab: Hashable {
    case departures
    case favorites
    case map
}

struct ContentView: View {
    @EnvironmentObject private var appDelegate: AppDelegate
    @StateObject private var networkMonitor = NetworkMonitor()
    @StateObject private var locationModel = LocationViewModel()
    @State private var showNoInternetBanner = false
    @State private var selectedTab: AppTab = .departures

    @AppStorage(
        AppStorageKeys.hasSeenWelcomeScreen.rawValue
    ) var hasSeenWelcomeScreen = false
    @StateObject var stopsViewModel = StopsViewModel()
    @StateObject var favoritesViewModel = FavoritesViewModel()
    @State private var showWelcomeScreen: Bool = false
    @State private var showSearchScreen: Bool = false
    @State private var showInfotexts: Bool = false

    var body: some View {
        ZStack {
            TabView(selection: $selectedTab) {
                NavigationStack {
                    ClosestStopPageView()
                        .toolbar {
                            ToolbarItem(placement: .topBarLeading) {
                                NavigationLink {
                                    SettingsPageView()
                                } label: {
                                    Label("Settings", systemImage: "gearshape")
                                }
                            }
                            ToolbarItemGroup(placement: .topBarTrailing) {
                                Button(action: {
                                    showInfotexts = true
                                }) {
                                    Label("Info", systemImage: "info.bubble")
                                }
                                Button(action: {
                                    showSearchScreen = true
                                }) {
                                    Label("Search", systemImage: "magnifyingglass")
                                }
                            }
                        }
                }
                .tabItem {
                    Label("Departures", systemImage: "clock")
                }
                .tag(AppTab.departures)

                NavigationStack {
                    FavoritesPageView()
                        .environmentObject(stopsViewModel)
                        .environmentObject(favoritesViewModel)
                }
                .tabItem {
                    Label("Favorites", systemImage: "star.fill")
                }
                .tag(AppTab.favorites)

                MapPageView()
                    .environmentObject(stopsViewModel)
                    .environmentObject(favoritesViewModel)
                    .tabItem {
                        Label("Map", systemImage: "map")
                    }
                    .tag(AppTab.map)
            }
            .sheet(
                isPresented: $showSearchScreen,
                onDismiss: {
                    showSearchScreen = false
                }
            ) {
                SearchPageView(
                    location: locationModel.location
                )
                .environmentObject(stopsViewModel)
                .environmentObject(favoritesViewModel)
                .presentationDetents([.large])
            }
            .sheet(isPresented: $showInfotexts) {
                InfotextsPageView()
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
        .onAppear {
            showWelcomeScreen = !hasSeenWelcomeScreen
            handleQuickAction(appDelegate.quickAction)
        }
        .onChange(of: appDelegate.quickAction) { _, action in
            handleQuickAction(action)
        }
        .onReceive(networkMonitor.$isConnected) { isConnected in
            setShowNoInternetBanner(!isConnected)
        }
    }

    private func handleQuickAction(_ action: QuickAction?) {
        guard let action else { return }
        appDelegate.quickAction = nil
        switch action {
        case .map: selectedTab = .map
        case .favorites: selectedTab = .favorites
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
}

#Preview {
    ContentView()
        .environmentObject(AppDelegate())
}
