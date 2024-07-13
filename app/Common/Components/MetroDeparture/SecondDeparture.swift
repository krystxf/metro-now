
import SwiftUI

struct MetroDepartureCardSecondDeparture: View {
    let departureDate: Date

    var body: some View {
        Text(
            "Also in "
        ).font(.caption2)
            .fontWeight(.bold)
            .foregroundStyle(.white)
            .opacity(0.9)
        Text(
            .currentDate, format: .reference(to: departureDate, allowedFields: [.second, .minute, .hour])
        )
        .font(.caption2)
        .fontWeight(.bold)
        .foregroundStyle(.white)
        .opacity(0.9)
    }
}
