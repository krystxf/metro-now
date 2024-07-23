
import SwiftUI

struct MetroDepartureDeparture {
    let direction: String
    let date: Date
}

struct MetroDeparture: View {
    @State var metroLine: String
    @State var direction: String
    @State var departures: [ApiDeparture] = []

    var body: some View {
        MetroDepartureCard(backgroundColor: getMetroLineColor(metroLine)) {
            MetroDepartureCardLabel(direction: direction, metroLine: metroLine)

            Spacer()

            VStack {
                if departures.count >= 1 {
                    MetroDepartureCardFirstDeparture(departureDate: departures[0].departure)
                }
                if departures.count >= 2 {
                    MetroDepartureCardSecondDeparture(
                        direction: departures[0].heading == departures[1].heading ? nil : departures[1].heading,
                        departureDate: departures[1].departure
                    )
                }
            }
        }
    }
}
