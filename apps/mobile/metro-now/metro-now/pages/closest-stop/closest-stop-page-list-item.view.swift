// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct ClosestStopPageListItemView: View {
    let routeLabel: String
    let routeLabelBackground: Color?

    let headsign: String
    let departure: Date

    let nextHeadsign: String?
    let nextDeparture: Date?

    var body: some View {
        HStack(
            alignment: .top,
            spacing: 8
        ) {
            RouteNameIconView(
                label: routeLabel,
                background: routeLabelBackground ?? Color.black
            )

            VStack(alignment: .trailing, spacing: 4) {
                HStack {
                    Text(headsign)
                    Spacer()
                    CountdownView(targetDate: departure)
                }

                if let nextHeadsign, let nextDeparture {
                    HStack {
                        if headsign != nextHeadsign {
                            Text(nextHeadsign)
                        }
                        Spacer()
                        CountdownView(
                            targetDate: nextDeparture
                        ) {
                            headsign == nextHeadsign ? $0 : "Also in \($0)"
                        }
                    }
                    .foregroundStyle(.secondary)
                    .font(.footnote)
                }
            }
            .fontWeight(.semibold)
        }
    }
}

#Preview("single metro line") {
    List {
        ClosestStopPageListItemView(
            routeLabel: "A",
            routeLabelBackground: .green,
            headsign: "Nemocnice Motol",
            departure: .now + 10 * 60,
            nextHeadsign: "Nemocnice Motol",
            nextDeparture: .now + 15 * 60
        )
        ClosestStopPageListItemView(
            routeLabel: "A",
            routeLabelBackground: .green,
            headsign: "Depo Hostivař",
            departure: .now + 10 * 60,
            nextHeadsign: "Skalka",
            nextDeparture: .now + 15 * 60
        )
    }
}
