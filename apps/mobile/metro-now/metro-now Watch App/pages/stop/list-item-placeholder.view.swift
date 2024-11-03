// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct StopDepartureListItemPlaceholderView: View {
    let color: Color

    init(color: Color?
    ) {
        self.color = color ?? Color.gray.opacity(0.3)
    }

    var body: some View {
        StopDepartureListItemView(
            color: color,
            headsign: "Loading",
            departure: .now,
            nextHeadsign: "Loading",
            nextDeparture: .now
        )
        .redacted(reason: .placeholder)
    }
}

#Preview {
    ScrollView {
        StopDepartureListItemPlaceholderView(
            color: .red
        )
        StopDepartureListItemPlaceholderView(
            color: .red
        )
        StopDepartureListItemPlaceholderView(
            color: .green
        )
        StopDepartureListItemPlaceholderView(
            color: .green
        )
    }
}
