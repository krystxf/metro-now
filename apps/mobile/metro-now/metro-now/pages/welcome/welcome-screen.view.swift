// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

private let headingGradient = LinearGradient(
    colors: [.indigo, .blue],
    startPoint: .leading,
    endPoint: .trailing
)

struct WelcomeScreenView: View {
    let handleDismiss: () -> Void

    @State private var showContent = false

    var body: some View {
        VStack(alignment: .center) {
            if showContent {
                Text("Welcome to")
                    .fontWeight(.bold)
                    .font(.title)

                Text("metro now")
                    .foregroundStyle(headingGradient)
                    .transition(.scale)
                    .fontWeight(.black)
                    .font(.system(size: 50))

                VStack(spacing: 20) {
                    Text("This app is currently in development, so you might notice some features are still in progress."
                    )

                    Text("Thanks for your patience as we work to improve your experience! ❤️‍🔥")
                        .fontWeight(.semibold)
                }
                .padding(.vertical, 10)
                .font(.title3)
                .multilineTextAlignment(.center)

                Button(action: handleDismiss) {
                    Text("Continue")
                    Image(systemName: "chevron.forward")
                }
                .font(.headline)
                .fontWeight(.bold)
                .buttonStyle(.borderedProminent)
                .padding(.top, 20)
            }
        }
        .padding()
        .fontDesign(.rounded)
        .onAppear {
            withAnimation {
                showContent = true
            }
        }
    }
}

#Preview {
    WelcomeScreenView {}
}
