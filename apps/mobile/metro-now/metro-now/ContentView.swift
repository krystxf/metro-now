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
            }
            .sheet(
                isPresented: $showWelcomeScreen,
                onDismiss: dismissWelcomeScreen
            ) {
                WelcomeScreenView(handleDismiss: dismissWelcomeScreen)
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
            if !isConnected {
                withAnimation {
                    showNoInternetBanner = true
                }

                // Hide the banner after a delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 10) {
                    withAnimation {
                        showNoInternetBanner = false
                    }
                }
            }
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
