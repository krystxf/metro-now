// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct RouteNameIconView: View {
    let label: String
    let background: Color

    private let fontSize: CGFloat
    private let minWidth: CGFloat
    private let height: CGFloat
    private let horizontalPadding: CGFloat
    private let cornerRadius: CGFloat

    init(label: String, background: Color, compact: Bool = false) {
        self.label = label
        self.background = background
        if compact {
            fontSize = 10
            minWidth = 20
            height = 20
            horizontalPadding = 3
            cornerRadius = 4
        } else {
            fontSize = 12
            minWidth = 26
            height = 26
            horizontalPadding = 4
            cornerRadius = 6
        }
    }

    var body: some View {
        Text(label.uppercased())
            .font(.system(size: fontSize))
            .fontWeight(.bold)
            .fontDesign(.rounded)
            .foregroundStyle(.white)
            .padding(.horizontal, horizontalPadding)
            .frame(minWidth: minWidth)
            .frame(height: height)
            .background(Rectangle().fill(background))
            .clipShape(
                .rect(cornerRadius: cornerRadius)
            )
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
