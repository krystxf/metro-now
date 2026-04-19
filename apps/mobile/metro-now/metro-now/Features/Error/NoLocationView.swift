// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct NoLocationView: View {
    var body: some View {
        ContentUnavailableView {
            Label(
                "Location Unavailable",
                systemImage: "location.slash"
            )
        } description: {
            Text(
                "Make sure you granted location permission to the app."
            )
        }
    }
}

#Preview {
    NoLocationView()
}
