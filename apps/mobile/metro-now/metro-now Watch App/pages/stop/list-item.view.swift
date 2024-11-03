// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct StopDepartureListItemView: View {
    let color: Color

    let headsign: String
    let departure: Date

    let nextHeadsign: String?
    let nextDeparture: Date?

    init(
        color: Color?,
        headsign: String,
        departure: Date,
        nextHeadsign: String? = nil,
        nextDeparture: Date? = nil
    ) {
        self.color = color ?? Color.gray.opacity(0.3)
        self.headsign = shortenStopName(headsign)
        self.departure = departure

        if let nextHeadsign {
            self.nextHeadsign = shortenStopName(nextHeadsign)
        } else {
            self.nextHeadsign = nil
        }

        self.nextDeparture = nextDeparture
    }

    var body: some View {
        VStack(alignment: .trailing) {
            HStack {
                Text(headsign)
                Spacer()
                CountdownView(targetDate: departure)
            }

            if let nextHeadsign, let nextDeparture {
                HStack {
                    if headsign == nextHeadsign {
                        Spacer()
                        CountdownView(targetDate: nextDeparture) { "also in \($0)" }
                    } else {
                        Text(nextHeadsign)
                        Spacer()
                        CountdownView(targetDate: nextDeparture)
                    }
                }
                .font(.system(size: 12))
            }
        }
        .fontWeight(.semibold)
        .foregroundStyle(.primary)
        .padding(.vertical, 10)
        .padding(.horizontal, 5)
        .background(color)
        .clipShape(.rect(cornerRadius: 14))
        .listRowInsets(zeroEdgeInsets)
        .frame(height: .zero)
    }
}
