// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct BannerView: View {
    let label: String
    let systemImage: String
    let color: Color

    init(
        label: String,
        systemImage: String,
        color: Color? = nil
    ) {
        self.label = label
        self.systemImage = systemImage
        self.color = color?.opacity(0.5) ?? Color.accentColor.opacity(0)
    }

    var body: some View {
        Label(label, systemImage: systemImage)
            .font(.footnote.bold())
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .modifier(BannerBackgroundModifier(color: color))
    }
}

private struct BannerBackgroundModifier: ViewModifier {
    let color: Color

    func body(content: Content) -> some View {
        content
            .background(color)
            .background(
                .ultraThinMaterial,
                in: RoundedRectangle(cornerRadius: 10)
            )
    }
}

#Preview {
    VStack {
        Spacer()
        BannerView(
            label: "No Internet Connection",
            systemImage: "antenna.radiowaves.left.and.right.slash",
            color: .red
        )

        BannerView(
            label: "Tips and tricks",
            systemImage: "info.circle"
        )
    }
}
