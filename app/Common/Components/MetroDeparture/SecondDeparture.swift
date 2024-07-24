
import SwiftUI

struct MetroDepartureCardSecondDeparture: View {
    let direction: String?
    let departureDate: Date
    let text: String

    init(direction: String?, departureDate: Date) {
        self.direction = direction
        self.departureDate = departureDate

        if let direction {
            text = "To \(direction) "
        } else {
            text = "Also "
        }
    }

    var body: some View {
        HStack(spacing: 0) {
            Text(text)
            Countdown(departureDate)
        }
        .font(.caption2)
        .fontWeight(.bold)
        .foregroundStyle(.white)
        .opacity(0.9)
    }
}
