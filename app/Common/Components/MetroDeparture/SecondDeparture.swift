
import SwiftUI

struct MetroDepartureCardSecondDeparture: View {
    let direction: String?
    let departureDate: Date

    var body: some View {
        Text(
            direction == nil ? "Also in " : "Also to \(String(describing: direction)) in"
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
