// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct PlatformDetailView: View {
    let platformId: String
    let metroLine: MetroLine?
    @State var departures: [ApiDeparture]? = nil
    private let timer = Timer.publish(every: 2, on: .main, in: .common).autoconnect()

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
                let backgroundColor = getMetroLineColor(
                    metroLine ?? MetroLine(rawValue: departures[0].route)
                ) ?? .clear

                PlatformDetailNextDepartureView(
                    headsign: departures[0].headsign,
                    departure: departures[0].departure.scheduled,
                    nextHeadsign: departures[1].headsign,
                    nextDeparture: departures[1].departure.predicted
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
                    Button(metroLineName, action: {}).foregroundStyle(.white)
                }
            }
        }

        .tabViewStyle(.verticalPage(transitionStyle: .identity))
        .onAppear {
            getDepartures()
        }
        .onReceive(timer) { _ in
            getDepartures()
        }
    }

    func getDepartures() {
        NetworkManager.shared
            .getDepartures(stopIds: [], platformIds: [platformId]) { result in
                DispatchQueue.main.async {
                    switch result {
                    case let .success(departures):

                        self.departures = departures
                        print(departures)

                    case let .failure(error):
                        print(error.localizedDescription)
                    }
                }
            }
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
