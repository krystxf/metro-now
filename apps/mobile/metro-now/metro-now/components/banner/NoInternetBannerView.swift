// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct NoInternetBannerView: View {
    var body: some View {
        BannerView(
            label: "No Internet Connection",
            systemImage: "antenna.radiowaves.left.and.right.slash",
            color: .red
        )
    }
}

#Preview {
    NoInternetBannerView()
    Spacer()
}
