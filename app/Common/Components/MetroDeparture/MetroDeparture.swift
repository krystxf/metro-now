
import SwiftUI

struct MetroDeparture: View {
    @State var direction: String

    /// only first two items from array are shown
    /// this view doesn't handle logic of deciding which departures are outdated (shouldn't be shown)
    @State var departureDates: [Date]

    @State var metroLine: String

    var body: some View {
        MetroDepartureCard(backgroundColor: getMetroLineColor(metroLine)) {
            MetroDepartureCardLabel(direction: direction, metroLine: metroLine)

            Spacer()

            VStack {
                if departureDates.count >= 1 {
                    MetroDepartureCardFirstDeparture(departureDate: departureDates[0])
                }
                if departureDates.count >= 2 {
                    MetroDepartureCardSecondDeparture(departureDate: departureDates[1])
                }
            }
        }
    }
}
