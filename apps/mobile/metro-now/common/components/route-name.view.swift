// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct RouteNameIconView: View {
    let label: String
    let background: Color

    var body: some View {
        Text(label.uppercased())
            .font(.system(size: 12, weight: .bold, design: .monospaced))
            .foregroundStyle(.white)
            .fixedSize(horizontal: true, vertical: true)
            .frame(width: 26, height: 26)
            .background(Rectangle().fill(background))
            .clipShape(.rect(cornerRadius: 6))
    }
}

#Preview {
    HStack {
        RouteNameIconView(
            label: "a",
            background: getColorByRouteName("a")
        )

        RouteNameIconView(
            label: "b",
            background: getColorByRouteName("b")
        )

        RouteNameIconView(
            label: "c",
            background: getColorByRouteName("c")
        )
    }

    HStack {
        RouteNameIconView(
            label: "2",
            background: getColorByRouteName("28")
        )
        RouteNameIconView(
            label: "23",
            background: getColorByRouteName("28")
        )
        RouteNameIconView(
            label: "28",
            background: getColorByRouteName("28")
        )
        RouteNameIconView(
            label: "99",
            background: getColorByRouteName("99")
        )
    }

    HStack {
        RouteNameIconView(
            label: "149",
            background: getColorByRouteName("149")
        )

        RouteNameIconView(
            label: "912",
            background: getColorByRouteName("912")
        )
    }

    HStack {
        RouteNameIconView(
            label: "P2",
            background: getColorByRouteName("P2")
        )
        RouteNameIconView(
            label: "P4",
            background: getColorByRouteName("P2")
        )
        RouteNameIconView(
            label: "P6",
            background: getColorByRouteName("P2")
        )
    }

    HStack {
        RouteNameIconView(
            label: "S9",
            background: getColorByRouteName("S49")
        )
        RouteNameIconView(
            label: "S88",
            background: getColorByRouteName("S49")
        )
        RouteNameIconView(
            label: "R19",
            background: getColorByRouteName("S49")
        )
    }

    HStack {
        RouteNameIconView(
            label: "LD",
            background: getColorByRouteName("LD")
        )
    }
}
