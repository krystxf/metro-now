// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct ClosestStopPageListItemPlaceholderView: View {
    let routeLabel: String? // route label will be blured if not specified
    let routeLabelBackground: Color

    init(
        routeLabel: String? = nil,
        routeLabelBackground: Color = .gray
    ) {
        self.routeLabel = routeLabel
        self.routeLabelBackground = routeLabelBackground
    }

    var body: some View {
        if let routeLabel {
            HStack(
                alignment: .top,
                spacing: 8
            ) {
                RouteNameIconView(
                    label: routeLabel,
                    background: routeLabelBackground
                )

                VStack(alignment: .trailing, spacing: 4) {
                    HStack {
                        Text("Loading...")
                        Spacer()
                        CountdownView(targetDate: .now + 10 * 60)
                    }

                    HStack {
                        Spacer()
                        CountdownView(
                            targetDate: .now + 15 * 60
                        ) {
                            "Also in \($0)"
                        }
                    }
                    .foregroundStyle(.secondary)
                    .font(.footnote)
                }
                .fontWeight(.semibold)
                .redacted(reason: .placeholder)
            }
        } else {
            ClosestStopPageListItemView(
                routeLabel: "74",
                routeLabelBackground: routeLabelBackground,
                headsign: "Loading...",
                departure: .now + 10 * 60,
                nextHeadsign: "Loading...",
                nextDeparture: .now + 15 * 60
            )
            .redacted(reason: .placeholder)
        }
    }
}

#Preview {
    List {
        ClosestStopPageListItemPlaceholderView(
            routeLabel: "A",
            routeLabelBackground: getColorByRouteName("A")
        )
        ClosestStopPageListItemPlaceholderView(
            routeLabel: "A",
            routeLabelBackground: getColorByRouteName("A")
        )
        ClosestStopPageListItemPlaceholderView(
            routeLabel: "C",
            routeLabelBackground: getColorByRouteName("C")
        )
        ClosestStopPageListItemPlaceholderView(
            routeLabel: "C",
            routeLabelBackground: getColorByRouteName("C")
        )
        ClosestStopPageListItemPlaceholderView(
            routeLabel: nil,
            routeLabelBackground: getColorByRouteName("49")
        )
        ClosestStopPageListItemPlaceholderView(
            routeLabel: nil,
            routeLabelBackground: getColorByRouteName("149")
        )
        ClosestStopPageListItemPlaceholderView(
            routeLabel: nil,
            routeLabelBackground: getColorByRouteName("P2")
        )
        ClosestStopPageListItemPlaceholderView(
            routeLabel: nil,
            routeLabelBackground: getColorByRouteName("LD")
        )
    }
}
