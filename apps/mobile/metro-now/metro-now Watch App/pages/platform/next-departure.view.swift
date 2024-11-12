// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct PlatformDetailNextDepartureView: View {
    let headsign: String
    let departure: Date
    let nextHeadsign: String?
    let nextDeparture: Date?

    var body: some View {
        VStack(spacing: 40) {
            VStack {
                Spacer()
                Label(
                    shortenStopName(headsign),
                    systemImage: "arrowshape.forward"
                ).font(.title2)
                    .fontWeight(.semibold)
                    .symbolVariant(.fill)
                    .imageScale(.small)
                    .foregroundStyle(.secondary)

                CountdownView(
                    targetDate: departure
                )
                .font(.largeTitle)
                .foregroundStyle(.primary)
            }

            if let nextHeadsign, let nextDeparture {
                if headsign == nextHeadsign {
                    CountdownView(
                        targetDate: nextDeparture
                    ) {
                        "Also in \($0)"
                    }.foregroundStyle(.tertiary)
                } else {
                    VStack {
                        Text(
                            shortenStopName(nextHeadsign)
                        )

                        CountdownView(
                            targetDate: nextDeparture
                        )
                    }.foregroundStyle(.secondary)
                }
            }
        }
    }
}
