// metro-now
// https://github.com/krystxf/metro-now

import Apollo
import MetroNowAPI
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
                        ToolbarItem(placement: .topBarTrailing) {
                            Button(action: {
                                showInfotexts = true
                            }) {
                                Label("Info", systemImage: "info.bubble")
                            }
                        }
                        ToolbarItem(placement: .topBarTrailing) {
                            Button(action: {
                                showSearchScreen = true
                            }) {
                                Label("Search", systemImage: "magnifyingglass")
                            }
                        }
                    }
            }

            // MARK: - search sheet

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

            // MARK: - infotext sheet

            .sheet(
                isPresented: $showInfotexts,
                onDismiss: {
                    showInfotexts = false
                }
            ) {
                InfotextsPageView()
                    .presentationDetents([.large])
            }

            // MARK: - welcome sheet

            .sheet(
                isPresented: $showWelcomeScreen,
                onDismiss: dismissWelcomeScreen
            ) {
                WelcomePageView()
                    .presentationDetents([.medium])
            }

            VStack {
                Spacer()
                if showNoInternetBanner {
                    NoInternetBannerView()
                        .transition(getBannerTransition(.bottom))
                }
            }
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
