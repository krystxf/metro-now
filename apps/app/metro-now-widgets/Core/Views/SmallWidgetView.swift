//
//  Author: Kryštof Krátký
//

import SwiftUI

struct SmallWidgetView: View {
    var entry: Provider.Entry

    var body: some View {
        VStack {
            WidgetHeading(stationName: entry.stationName)
            ForEach(entry.departures, id: \.departureDate) { departure in
                Departure(
                    direction: departure.direction,
                    departureDate: departure.departureDate,
                    metroLine: departure.metroLine
                )
            }
        }
    }
}
