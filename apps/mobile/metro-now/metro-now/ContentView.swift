// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct ContentView: View {
    @StateObject private var networkMonitor = NetworkMonitor()
    @StateObject private var locationModel = LocationViewModel()
    @State private var showNoInternetBanner = false

    @AppStorage(
        AppStorageKeys.hasSeenWelcomeScreen.rawValue
    ) var hasSeenWelcomeScreen = false
    @StateObject var stopsViewModel = StopsViewModel()
    @State private var showWelcomeScreen: Bool = false
    @State private var showSearchScreen: Bool = false
    @State private var showInfotexts: Bool = false

    var body: some View {
        ZStack {
            TabView {
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

                NavigationStack {
                    MapPageView()
                        .environmentObject(stopsViewModel)
                        .navigationTitle("Map")
                }
                .tabItem {
                    Label("Map", systemImage: "map")
                }
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
        }
        .onReceive(networkMonitor.$isConnected) { isConnected in
            setShowNoInternetBanner(!isConnected)
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
}
