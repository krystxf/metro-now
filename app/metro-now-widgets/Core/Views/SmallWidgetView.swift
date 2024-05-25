//
//  Author: Kryštof Krátký
//

import SwiftUI

struct SmallWidgetView: View {
    var entry: Provider.Entry

    var body: some View {
        VStack {
            WidgetHeading(stationName: "Kacerov")
            Departure(
                direction: "Haje",
                departureDate: Date(),
                metroLine: "C"
            )
            Departure(
                direction: "Letnany",
                departureDate: Date(),
                metroLine: "C"
            )
        }
    }
}
