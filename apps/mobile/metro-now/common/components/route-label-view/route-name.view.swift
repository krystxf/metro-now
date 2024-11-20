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
            label: "XA",
            background: getRouteColor("XA")
        )
        RouteNameIconView(
            label: "a",
            background: getRouteColor("a")
        )
        RouteNameIconView(
            label: "b",
            background: getRouteColor("b")
        )
        RouteNameIconView(
            label: "c",
            background: getRouteColor("c")
        )
    }

    HStack {
        RouteNameIconView(
            label: "X2",
            background: getRouteColor("X2")
        )
        RouteNameIconView(
            label: "2",
            background: getRouteColor("2")
        )
        RouteNameIconView(
            label: "23",
            background: getRouteColor("23")
        )
        RouteNameIconView(
            label: "28",
            background: getRouteColor("28")
        )
        RouteNameIconView(
            label: "99",
            background: getRouteColor("99")
        )
    }

    HStack {
        RouteNameIconView(
            label: "X149",
            background: getRouteColor("X149")
        )
        RouteNameIconView(
            label: "BB1",
            background: getRouteColor("BB1")
        )
        RouteNameIconView(
            label: "149",
            background: getRouteColor("149")
        )
        RouteNameIconView(
            label: "912",
            background: getRouteColor("912")
        )
    }

    HStack {
        RouteNameIconView(
            label: "P2",
            background: getRouteColor("P2")
        )
        RouteNameIconView(
            label: "P4",
            background: getRouteColor("P2")
        )
        RouteNameIconView(
            label: "P6",
            background: getRouteColor("P2")
        )
    }

    HStack {
        RouteNameIconView(
            label: "XS9",
            background: getRouteColor("XS9")
        )
        RouteNameIconView(
            label: "S9",
            background: getRouteColor("S9")
        )
        RouteNameIconView(
            label: "S88",
            background: getRouteColor("S88")
        )
        RouteNameIconView(
            label: "R19",
            background: getRouteColor("R19")
        )
    }

    HStack {
        RouteNameIconView(
            label: "LD",
            background: getRouteColor("LD")
        )
    }
}
