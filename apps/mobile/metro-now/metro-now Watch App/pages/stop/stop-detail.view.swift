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

struct StopDeparturesView: View {
    let title: String
    let platforms: [MainPagePlatform]

    @State var selectedPlatformId: String? = nil

    var body: some View {
        NavigationSplitView {
            List(platforms, id: \.id, selection: $selectedPlatformId) { platform in
                let itemColor = getRouteColor(
                    platform.metroLine?.rawValue
                )

                if let departures = platform.departures, departures.count > 0 {
                    let hasNextDeparture = departures.count > 1

                    StopDepartureListItemView(
                        color: itemColor,
                        headsign: departures[0].headsign,
                        departure: departures[0].departure.predicted,
                        nextHeadsign: hasNextDeparture ? departures[1].headsign : nil,
                        nextDeparture: hasNextDeparture ? departures[1].departure.predicted : nil
                    )

                } else {
                    StopDepartureListItemPlaceholderView(
                        color: itemColor
                    )
                }
            }

            .navigationTitle(shortenStopName(title))

        } detail: {
            let platform = platforms.first(
                where: {
                    $0.id == selectedPlatformId

                })

            if let platform {
                PlatformDetailView(
                    platformId: platform.id,
                    metroLine: platform.metroLine,
                    departures: platform.departures
                )
            } else {
                EmptyView()
            }
        }
    }
}

#Preview {
    StopDeparturesView(
        title: "Florenc",
        platforms: [
            MainPagePlatform(
                id: "U689Z101P",
                metroLine: .B,
                departures: nil
            ),
            MainPagePlatform(
                id: "U689Z102P",
                metroLine: .B,
                departures: nil
            ),
            MainPagePlatform(
                id: "U689Z121P",
                metroLine: .C,
                departures: nil
            ),
            MainPagePlatform(
                id: "U689Z122P",
                metroLine: .C,
                departures: nil
            ),
        ]
    )
}
