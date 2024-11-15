// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct ClosestStopPageListItemPlaceholderView: View {
    let routeLabel: String?
    let routeLabelBackground: Color

    var body: some View {
        HStack(
            alignment: .top,
            spacing: 8
        ) {
            if let routeLabel {
                RouteNameIconView(
                    label: routeLabel,
                    background: routeLabelBackground
                )
            } else {
                RouteNameIconView(
                    label: "X",
                    background: routeLabelBackground
                )
                .redacted(reason: .placeholder)
            }

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
