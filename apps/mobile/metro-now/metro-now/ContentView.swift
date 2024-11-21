// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct ContentView: View {
    @State private var showWelcomeScreen: Bool = false
    @AppStorage(
        AppStorageKeys.hasSeenWelcomeScreen.rawValue
    ) var hasSeenWelcomeScreen = false

    var body: some View {
        NavigationStack {
            ClosestStopPageView()
        }
        .onAppear {
            showWelcomeScreen = !hasSeenWelcomeScreen
        }
        .sheet(
            isPresented: $showWelcomeScreen,
            onDismiss: dismissWelcomeScreen
        ) {
            WelcomeScreenView(handleDismiss: dismissWelcomeScreen)
                .presentationDetents([.medium])
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
