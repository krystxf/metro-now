// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct ContentView: View {
    @State private var showWelcomeScreen = true

    var body: some View {
        NavigationStack {
            ClosestStopPageView()

        }.sheet(
            isPresented: $showWelcomeScreen,
            onDismiss: {
                showWelcomeScreen = false
            }
        ) {
            WelcomeScreenView(
                handleSubmit: {
                    showWelcomeScreen = false
                }
            )
            .presentationDetents([.medium])
        }
    }
}

#Preview {
    ContentView()
}
