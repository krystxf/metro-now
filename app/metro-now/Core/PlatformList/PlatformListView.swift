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
    //    @StateObject private var viewModel = PlatformListViewModel()
    @State private var departuresByGtfsID: GroupedDepartures?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 10) {
                    if let station, departuresByGtfsID != nil {
                        ForEach(station.properties.platforms, id: \.gtfsId) { platform in
                            PlatformListItemView(
                                direction: platform.direction,
                                departureDates: [],
                                metroLine: platform.name
                            )
                            //                            if  departuresByGtfsID?.contains(k -> k == platform.gtfsId) {
                            //                                PlatformListItemView(
                            //                                    direction: "platform.direction",
                            //                                    departureDates:  Date.now() , // departuresByGtfsID[platform.gtfsId].map(\.departureTimestamp.predicted) as! [Date],
                            //                                    metroLine: "A" // platform.name
                            //                                )
                            //                            }
                            //                            else {
                            //                                Text("No departures for this platform")
                            //                                    .foregroundColor(.red)
                            //                                    .font(.headline)
                            //                            }
                            //                            let platformDepartures =  departuresByGtfsID?[platform.gtfsId]
                            //                            let platformDepartures = departuresByGtfsID?[platform.gtfsId]
                            //                            let direction = platformDepartures.first?.heading ?? platform.direction

                            //                            NavigationLink {
                            //                                PlatformDetailView(
                            //                                    defaultDirection: platform.direction,
                            //                                    gtfsID: platform.gtfsId
                            //                                )
                            //                            }
                            //                            label: {
                            //                                PlatformListItemView(
                            //                                    direction: platform.direction,
                            //                                    departureDates: platformDepartures.map(\.departureTimestamp.predicted) as! [Date],
                            //                                    metroLine: "A" // platform.name
                            //                                )
                            //                            }
                        }
                    }
                    //                    if let station, departuresByGtfsID != nil {
                    //                        ForEach(station.properties.platforms, id: \.gtfsId) { platform in
                    //                            let platformDepartures = departuresByGtfsID?[platform.gtfsId] ?? []
                    //
                    //                            let direction = platformDepartures.first?.heading ?? platform.direction
                    //
                    //                            NavigationLink {
                    //                                PlatformDetailView(
                    //                                    defaultDirection: direction,
                    //                                    gtfsID: platform.gtfsId
                    //                                )
                    //                            }
                    //                            label: {
                    //                                PlatformListItemView(
                    //                                    direction: direction,
                    //                                    departureDates: platformDepartures.map(\.departureTimestamp.predicted) as! [Date],
                    //                                    metroLine: "A" // platform.name
                    //                                )
                    //                            }
                    //                        }
                    //
                    //                    }
                }
                .padding(10)
            }

            .navigationTitle(station?.properties.name ?? "")
            .task {
                guard let station else {
                    return
                }

                do {
                    let gtfsIDs = station.properties.platforms.map(\.gtfsId)
                    departuresByGtfsID = try await (getDepartures(gtfsIDs: gtfsIDs, groupBy: .platform))
                } catch {
                    print(error)
                }
            }
            .refreshable {
                guard let station else {
                    return
                }

                do {
                    let gtfsIDs = station.properties.platforms.map(\.gtfsId)
                    departuresByGtfsID = try await (getDepartures(gtfsIDs: gtfsIDs, groupBy: .platform))
                } catch {
                    print(error)
                }
            }
            //            .onAppear {
            //                viewModel.$departuresByGtfsID
            //                //                guard let station else {
            ////                    return
            ////                }
            ////
            ////                do {
            ////                     try await viewModel.getData(gtfsIDs: station.properties.platforms.map(\.gtfsId))
            ////                } catch {}
            //            }
            //            .refreshable {
            //                guard let station else {
            //                    return
            //                }
            //
            //            do {
            //                     try await viewModel.getData(gtfsIDs: station.properties.platforms.map(\.gtfsId))
            //                } catch {
            //                    print(error)
            //                }//
            //            }
        }
    }
}

#Preview("Muzeum") {
    PlatformsListView(
        station: getClosestStationFromGeoJSON(
            location: MUZEUM_COORDINATES
        )
    )
}

#Preview("Florenc") {
    PlatformsListView(
        station: getClosestStationFromGeoJSON(
            location: FLORENC_COORDINATES
        )
    )
}

#Preview("Můstek") {
    PlatformsListView(
        station: getClosestStationFromGeoJSON(
            location: MUSTEK_COORDINATES
        )
    )
}

#Preview("Dejvická") {
    PlatformsListView(
        station: getClosestStationFromGeoJSON(
            location: DEJVICKA_COORDINATES
        )
    )
}

#Preview("Hlavní nádraží") {
    PlatformsListView(
        station: getClosestStationFromGeoJSON(
            location: HLAVNI_NADRAZI_COORDINATES
        )
    )
}

#Preview("Černý Most") {
    PlatformsListView(
        station: getClosestStationFromGeoJSON(
            location: CERNY_MOST_COORDINATES
        )
    )
}
