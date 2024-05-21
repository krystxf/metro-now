//
//  PlatformListView.swift
//  metro-now
//

import CoreLocation
import SwiftUI

struct Departure {
    let platform: String
    let direction: String
    let departure: Date
}

struct PlatformsListView: View {
    var station: MetroStationsGeoJSONFeature?
    @StateObject private var viewModel = PlatformListViewModel()
    @State private var departuresByGtfsID: [String: [ApiDeparture]]?

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 10) {
                    if let station, let departuresByGtfsID {
                        ForEach(station.properties.platforms, id: \.self) { platform in
                            let platformDepartures = departuresByGtfsID[platform.gtfsId] ?? []
                            let direction = platformDepartures.first?.trip.headsign ?? platform.direction

                            NavigationLink {
                                PlatformDetailView(
                                    direction: direction
                                )
                            }
                            label: {
                                PlatformListItemView(
                                    direction: direction,
                                    departureDates: platformDepartures.map(\.departureTimestamp.predicted) as! [Date],
                                    metroLine: MetroLine(rawValue: platform.name) ?? .A
                                )
                            }
                        }
                    }
                }
                .padding(10)
            }

            .navigationTitle(station?.properties.name ?? "")
            .task {
                guard let station else {
                    return
                }

                do {
                    departuresByGtfsID = try await viewModel.getData(gtfsIDs: station.properties.platforms.map(\.gtfsId))
                } catch {}
            }
            .refreshable {
                guard let station else {
                    return
                }

                do {
                    departuresByGtfsID = try await viewModel.getData(gtfsIDs: station.properties.platforms.map(\.gtfsId))
                } catch {}
            }
        }
    }
}

#Preview("Muzeum") {
    PlatformsListView(station: getClosestStationFromGeoJSON(
        location: MUZEUM_COORDINATES
    ))
}

#Preview("Florenc") {
    PlatformsListView(station: getClosestStationFromGeoJSON(
        location: FLORENC_COORDINATES
    ))
}

#Preview("Můstek") {
    PlatformsListView(station: getClosestStationFromGeoJSON(
        location: MUSTEK_COORDINATES
    ))
}

#Preview("Dejvická") {
    PlatformsListView(station: getClosestStationFromGeoJSON(
        location: DEJVICKA_COORDINATES
    ))
}

#Preview("Hlavní nádraží") {
    PlatformsListView(station: getClosestStationFromGeoJSON(
        location: HLAVNI_NADRAZI_COORDINATES
    ))
}

#Preview("Černý Most") {
    PlatformsListView(station: getClosestStationFromGeoJSON(
        location: CERNY_MOST_COORDINATES
    ))
}
