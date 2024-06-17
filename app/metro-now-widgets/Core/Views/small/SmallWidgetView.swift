//
//  Author: Kryštof Krátký
//

import SwiftUI

struct SmallWidgetView: View {
    var entry: Provider.Entry

    var body: some View {
        VStack {
            WidgetHeading(stationName: entry.stationName)
            if entry.departures.count == 0 {
                Spacer()
                Text("No departures").font(.footnote)
                Spacer()
            } else {
                ForEach(0 ..< 2) { index in
                    if entry.departures.count > index {
                        DepartureView(
                            direction: entry.departures[index].direction,
                            departureDate: entry.departures[index].departureDate,
                            metroLine: entry.departures[index].metroLine
                        )
                    } else {
                        Spacer()
                    }
                }
            }
        }
    }
}
