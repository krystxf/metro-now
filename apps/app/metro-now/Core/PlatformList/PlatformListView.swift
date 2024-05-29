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
    @State private var departuresByGtfsID: DeparturesByGtfsIDs?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 10) {
                    if let station, departuresByGtfsID != nil {
                        ForEach(station.properties.platforms, id: \.gtfsId) { platform in
                            let platformDepartures = departuresByGtfsID?[platform.gtfsId] ?? []

                            let direction = platformDepartures.first?.trip.headsign ?? platform.direction

                            NavigationLink {
                                PlatformDetailView(
                                    defaultDirection: direction,
                                    gtfsID: platform.gtfsId
                                )
                            }
                            label: {
                                PlatformListItemView(
                                    direction: direction,
                                    departureDates: platformDepartures.map(\.departureTimestamp.predicted) as! [Date],
                                    metroLine: platform.name
                                )
                            }
                        }
//                        List($station.properties.platforms, id: \.self.gtfsId){platform in
//                            let platformDepartures = viewModel.departuresByGtfsID[platform.gtfsId] ?? []
//
//                            let direction = platformDepartures.first?.trip.headsign ?? platform.direction
//
//
//                            NavigationLink {
//                                PlatformDetailView(
//                                    direction: direction
//                                )
//                            }
//                            label: {
//                                PlatformListItemView(
//                                    direction: direction,
//                                    departureDates: platformDepartures.map{$0.departureTimestamp.predicted} as! [Date],
//                                    metroLine: platform.name
//                                )
//                            }
//                        }
//                        ForEach(station.properties.platforms, id: \.self.gtfsId) { platform in
//                            let platformDepartures = viewModel.departuresByGtfsID[platform.gtfsId]
//
//                            let direction = platformDepartures.first?.trip.headsign ?? platform.direction
//
//                            NavigationLink {
//                                PlatformDetailView(
//                                    direction: direction
//                                )
//                            }
//                            label: {
//                                PlatformListItemView(
//                                    direction: direction,
//                                    departureDates: platformDepartures.map{$0.departureTimestamp.predicted} as! [Date],
//                                    metroLine: platform.name
//                                )
//                            }
//                        }
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
                    let gtfsIDs = station.properties.platforms.map(\.gtfsId)
                    departuresByGtfsID = try await getDeparturesByGtfsID(gtfsIDs: gtfsIDs)
                    print(departuresByGtfsID)
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
                    departuresByGtfsID = try await getDeparturesByGtfsID(gtfsIDs: gtfsIDs)
                    print(departuresByGtfsID)
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
