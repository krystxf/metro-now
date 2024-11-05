// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct StopDepartureListItemView: View {
    let color: Color

    let headsign: String
    let departure: Date

    let nextHeadsign: String?
    let nextDeparture: Date?

    let dateFormat = DateFormatter()

    init(
        color: Color?,
        headsign: String,
        departure: Date,
        nextHeadsign: String? = nil,
        nextDeparture: Date? = nil
    ) {
        self.color = color ?? Color.gray.opacity(0.3)
        self.headsign = headsign
        self.departure = departure
        self.nextHeadsign = nextHeadsign
        self.nextDeparture = nextDeparture
    }

    var body: some View {
        VStack(alignment: .trailing) {
            HStack {
                Text(shortenStopName(headsign))
                Spacer()

                CountdownView(targetDate: departure)
            }
            if let nextHeadsign, let nextDeparture {
                HStack {
                    if nextHeadsign != headsign {
                        Text(nextHeadsign)
                    }
                    Spacer()
                    CountdownView(targetDate: nextDeparture) {
                        nextHeadsign == headsign ? "also in \($0)" : $0
                    }
                }.font(.system(size: 12))
            }
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 5)
        .background(color)
        .clipShape(.rect(cornerRadius: 14))
        .listRowInsets(
            EdgeInsets(
                top: 0,
                leading: 0,
                bottom: 0,
                trailing: 0
            )
        )
    }
}
