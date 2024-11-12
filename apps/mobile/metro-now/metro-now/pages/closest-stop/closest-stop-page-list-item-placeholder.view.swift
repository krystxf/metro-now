// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct ClosestStopPageListItemPlaceholderView: View {
    let routeLabel: String
    let routeLabelBackground: Color

    var body: some View {
        ClosestStopPageListItemView(
            routeLabel: routeLabel,
            routeLabelBackground: routeLabelBackground,
            headsign: "Loading...",
            departure: .now + 10 * 60,
            nextHeadsign: "Loading..",
            nextDeparture: .now + 15 * 60
        )
        .redacted(reason: .placeholder)
    }
}

#Preview("signle metro line") {
    List {
        ClosestStopPageListItemPlaceholderView(
            routeLabel: "A",
            routeLabelBackground: .green
        )
        ClosestStopPageListItemPlaceholderView(
            routeLabel: "A",
            routeLabelBackground: .green
        )
        ClosestStopPageListItemPlaceholderView(
            routeLabel: "C",
            routeLabelBackground: .red
        )
        ClosestStopPageListItemPlaceholderView(
            routeLabel: "C",
            routeLabelBackground: .red
        )
    }
}

#Preview("multiple metro lines") {
    List {
        ClosestStopPageListItemPlaceholderView(
            routeLabel: "A",
            routeLabelBackground: .green
        )
        ClosestStopPageListItemPlaceholderView(
            routeLabel: "A",
            routeLabelBackground: .green
        )
        ClosestStopPageListItemPlaceholderView(
            routeLabel: "C",
            routeLabelBackground: .red
        )
        ClosestStopPageListItemPlaceholderView(
            routeLabel: "C",
            routeLabelBackground: .red
        )
    }
}
