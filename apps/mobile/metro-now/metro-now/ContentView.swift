// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct ContentView: View {
    @StateObject private var networkMonitor = NetworkMonitor()
    @State private var showNoInternetBanner = false

    @AppStorage(
        AppStorageKeys.hasSeenWelcomeScreen.rawValue
    ) var hasSeenWelcomeScreen = false
    @State private var showWelcomeScreen: Bool = false

    var body: some View {
        ZStack {
            NavigationStack {
                ClosestStopPageView()
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            NavigationLink {
                                SettingsPageView()
                            } label: {
                                Label("Settings", systemImage: "gearshape")
                            }
                        }
                    }
            }
            .sheet(
                isPresented: $showWelcomeScreen,
                onDismiss: dismissWelcomeScreen
            ) {
                WelcomePageView(handleDismiss: dismissWelcomeScreen)
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
