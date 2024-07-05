
import SwiftUI

struct MetroDepartureCardFirstDeparture: View {
    let departureDate: Date

    var body: some View {
        Text(
            .currentDate, format: .reference(
                to: departureDate,
                allowedFields: [.second, .minute, .hour]
            )
        )
        .fontWeight(.bold)
        .foregroundStyle(.white)
        .foregroundStyle(.white)
    }
}
