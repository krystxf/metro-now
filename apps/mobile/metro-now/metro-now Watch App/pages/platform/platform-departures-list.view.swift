// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct PlatformDetailDeparturesListView: View {
    let departures: [ApiDeparture]

    var body: some View { List(departures, id: \.departure.predicted) { departure in
        HStack {
            Text(departure.headsign)
            Spacer()
            CountdownView(targetDate: departure.departure.predicted)
        }
    }}
}
