// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct NoInternetBannerView: View {
    var body: some View {
        BannerView(
            label: NSLocalizedString(
                "No Internet Connection",
                comment: "Banner title shown when the device is offline"
            ),
            systemImage: "antenna.radiowaves.left.and.right.slash",
            color: .red
        )
    }
}

#Preview {
    NoInternetBannerView()
    Spacer()
}
