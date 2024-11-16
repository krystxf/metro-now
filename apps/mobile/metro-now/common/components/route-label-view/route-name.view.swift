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
            background: getRouteType("a").color
        )

        RouteNameIconView(
            label: "b",
            background: getRouteType("b").color
        )

        RouteNameIconView(
            label: "c",
            background: getRouteType("c").color
        )
    }

    HStack {
        RouteNameIconView(
            label: "2",
            background: getRouteType("28").color
        )
        RouteNameIconView(
            label: "23",
            background: getRouteType("28").color
        )
        RouteNameIconView(
            label: "28",
            background: getRouteType("28").color
        )
        RouteNameIconView(
            label: "99",
            background: getRouteType("99").color
        )
    }

    HStack {
        RouteNameIconView(
            label: "149",
            background: getRouteType("149").color
        )

        RouteNameIconView(
            label: "912",
            background: getRouteType("912").color
        )
    }

    HStack {
        RouteNameIconView(
            label: "P2",
            background: getRouteType("P2").color
        )
        RouteNameIconView(
            label: "P4",
            background: getRouteType("P2").color
        )
        RouteNameIconView(
            label: "P6",
            background: getRouteType("P2").color
        )
    }

    HStack {
        RouteNameIconView(
            label: "S9",
            background: getRouteType("S49").color
        )
        RouteNameIconView(
            label: "S88",
            background: getRouteType("S49").color
        )
        RouteNameIconView(
            label: "R19",
            background: getRouteType("S49").color
        )
    }

    HStack {
        RouteNameIconView(
            label: "LD",
            background: getRouteType("LD").color
        )
    }
}
