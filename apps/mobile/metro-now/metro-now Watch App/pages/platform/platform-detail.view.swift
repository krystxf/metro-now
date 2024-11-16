// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct PlatformDetailView: View {
    let platformId: String
    let metroLine: MetroLine?
    let departures: [ApiDeparture]?
    
    init(
        platformId: String,
        metroLine: MetroLine? = nil,
        departures: [ApiDeparture]? = nil

    ) {
        self.platformId = platformId
        self.departures = departures
        self.metroLine = metroLine
    }

    var body: some View {
        TabView {
            if let departures, departures.count > 0 {
                let backgroundColor = getRouteType(
                    metroLine?.rawValue ?? departures.first?.route
                ).color
                let hasNextDeparture = departures.count > 1

                PlatformDetailNextDepartureView(
                    headsign: departures[0].headsign,
                    departure: departures[0].departure.predicted,
                    nextHeadsign: hasNextDeparture ? departures[1].headsign : nil,
                    nextDeparture: hasNextDeparture ? departures[1].departure.predicted : nil
                )
                .containerBackground(backgroundColor.gradient, for: .tabView)

                PlatformDetailDeparturesListView(departures: departures)
                    .containerBackground(backgroundColor.gradient, for: .tabView)

            } else {
                ProgressView()
            }
        }

        .toolbar {
            if let metroLineName = metroLine?.rawValue {
                ToolbarItem(
                    placement: .confirmationAction)
                {
                    if #available(watchOS 11, *) {
                        Text(metroLineName)
                            .overlay(
                                Circle()
                                    .size(width: 28, height: 28, anchor: .center)
                                    .stroke(.white.opacity(0.6), lineWidth: 3)
                            )
                            .fontWeight(.semibold)
                            .foregroundStyle(.white.opacity(0.6))
                    } else {
                        Text(metroLineName)
                            .fontWeight(.semibold)
                            .foregroundStyle(.white)
                    }
                }
            }
        }

        .tabViewStyle(.verticalPage(transitionStyle: .identity))
    }
}

#Preview {
    NavigationStack {
        PlatformDetailView(
            platformId: "U1040Z101P",
            metroLine: MetroLine.B
        )
    }
}
