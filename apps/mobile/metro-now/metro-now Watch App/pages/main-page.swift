// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct Departure {
    let id: String
    let headsing: String
}

struct MainPagePlatform {
    let id: String
    let metroLine: MetroLine?
    let departures: [ApiDeparture]?
}

struct MainPage: View {
    let title: String
    let platforms: [MainPagePlatform]

    var body: some View {
        NavigationView {
            ScrollView {
                VStack {
                    ForEach(platforms, id: \.id) { platform in
                        let itemColor = getMetroLineColor(platform.metroLine)

                        if let departures = platform.departures, departures.count > 0 {
                            let hasNextDeparture = departures.count > 1

                            DepartureListItem(
                                color: itemColor,
                                headsign: departures[0].headsign,
                                departure: departures[0].departure.predicted,
                                nextHeadsign: hasNextDeparture ? departures[1].headsign : nil,
                                nextDeparture: hasNextDeparture ? departures[1].departure.predicted : nil
                            )
                        } else {
                            DeparturePlaceholder(
                                color: itemColor
                            )
                        }
                    }
                }
            }

            .navigationTitle(shortenStopName(title))
        }
    }
}

#Preview {
    MainPage(
        title: "Muzeum",
        platforms: [
            MainPagePlatform(
                id: "1",
                metroLine: .A,
                departures: nil
            ),
            MainPagePlatform(
                id: "2",
                metroLine: .A,
                departures: nil
            ),
            MainPagePlatform(
                id: "3",
                metroLine: .C,
                departures: nil
            ),
            MainPagePlatform(
                id: "4",
                metroLine: .C,
                departures: nil
            ),
        ]
    )
}
