// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct NoNetworkConectionView: View {
    var body: some View {
        ContentUnavailableView {
            Label(
                "No Internet Connection",
                systemImage: "antenna.radiowaves.left.and.right.slash"
            )
        } description: {
            Text(
                "Please check your connection and try again."
            )
        }
    }
}

#Preview {
    NoNetworkConectionView()
}
