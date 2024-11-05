// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct RouteNameIconView: View {
    let label: String
    let background: Color

    var body: some View {
        Text(label.uppercased())
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(.white)
            .fixedSize(horizontal: true, vertical: true)
            .frame(width: 26, height: 26)
            .background(Rectangle().fill(background))
            .clipShape(.rect(cornerRadius: 6))
    }
}

#Preview {
    RouteNameIconView(
        label: "a",
        background: .green
    )

    RouteNameIconView(
        label: "b",
        background: .yellow
    )

    RouteNameIconView(
        label: "c",
        background: .red
    )

    RouteNameIconView(
        label: "28",
        background: .purple
    )

    RouteNameIconView(
        label: "99",
        background: .black
    )

    RouteNameIconView(
        label: "149",
        background: .blue
    )

    RouteNameIconView(
        label: "912",
        background: .black
    )
}
