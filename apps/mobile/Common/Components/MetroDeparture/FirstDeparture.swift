
import SwiftUI

struct MetroDepartureCardFirstDeparture: View {
    let departureDate: Date

    var body: some View {
        Countdown(departureDate)
            .fontWeight(.bold)
            .foregroundStyle(.white)
            .foregroundStyle(.white)
    }
}
