//
//  ContentView.swift
//  MetroMate Watch App
//
//  Created by Kryštof Krátký on 31.03.2024.
//

import CoreLocation
import os
import SwiftUI

struct ContentView: View {
//    let logger = Logger(subsystem: "com.apple.liveUpdatesSample", category: "DemoView")
//    @ObservedObject var locationsHandler = LocationsHandler.shared

    @ObservedObject var locationManager = LocationManager.shared
    @State private var isLoading: Bool = true
    @State private var station: Station?
    @State private var allDepartures: [Departure] = []
    @State var selectedDeparture: Departure.ID?

    @State var selectedPlatform: Platform.ID?

    func populateStation() {
        let userCoordinates = locationManager.userLocation?.coordinate
        let lat = userCoordinates?.latitude
        let lon = userCoordinates?.longitude

        if let lat, let lon {
            station = getClosestStation(lat: lat, lon: lon)
        }
    }

    func populateDepartures(platformIDs: [String]) {
        fetchDepartureBoardData(platformIDs: platformIDs) { result in
            switch result {
            case let .success(data):
                allDepartures = data
                isLoading = false
            case let .failure(error):
                print("Error: \(error)")
            }
        }
    }

    func populateAll() {
        populateStation()

        let platformIDs = station?.platforms.map(\.gtfsId)
        if let platformIDs {
            populateDepartures(platformIDs: platformIDs)
        }
    }

//    var body: some View {
//        VStack {
//            Spacer()
//            Text("Location: \(self.locationsHandler.lastLocation)")
//                .padding(10)
//            Text("Count: \(self.locationsHandler.count)")
//            Text("isStationary:")
//            Rectangle()
//                .fill(self.locationsHandler.isStationary ? .green : .red)
//                .frame(width: 100, height: 100, alignment: .center)
//            Spacer()
//            Button(self.locationsHandler.updatesStarted ? "Stop Location Updates" : "Start Location Updates") {
//                self.locationsHandler.updatesStarted ? self.locationsHandler.stopLocationUpdates() : self.locationsHandler.startLocationUpdates()
//            }
//            .buttonStyle(.bordered)
//            Button(self.locationsHandler.backgroundActivity ? "Stop BG Activity Session" : "Start BG Activity Session") {
//                self.locationsHandler.backgroundActivity.toggle()
//            }
//            .buttonStyle(.bordered)
//        }
//    }

    var body: some View {
        if locationManager.userLocation == nil {
            RequestAccessToLocationView()
        } else if isLoading {
            LoadingView(
                stationName: station?.name
            ).onAppear {
                populateAll()

                Timer.scheduledTimer(
                    withTimeInterval: 20,
                    repeats: true
                ) { _ in
                    populateAll()
                }
            }
        } else if allDepartures.count == 0 {
            NoDeparturesView()
        } else {
            NavigationSplitView {
                TabView {
                    let platformIDs = station?.platforms.map(\.gtfsId)
                    let departures = platformIDs?.compactMap { platformID in
                        allDepartures.first { departureBoardRecord in
                            departureBoardRecord.stop.id == platformID
                        }
                    }

                    List(station!.platforms, selection: $selectedPlatform) { platform in
                        let departure = allDepartures.first(where: {
                            $0.stop.id == platform.gtfsId
                        })!

                        HStack {
                            Text(getShortenStationName(departure.trip.headsign)).fontWeight(.semibold)
                            Spacer()
                            CountdownView(countdownViewModel: CountdownViewModel(targetDateString: departure.departureTimestamp.predicted))
                        }
                        .tag(platform.gtfsId)
                        .listItemTint(getLineColor(line: departure.route.shortName))
                    }
                    .navigationTitle(
                        getShortenStationName(station?.name ?? String())
                    )
                }

// TODO:
//                .toolbar {
//                    ToolbarItem(placement: .topBarLeading) { NavigationLink {
//                        SettingsView()
//                    } label: {
//                        Label(
//                            "Settings", systemImage: "gear"
//                        )
//                    }
//                    }
//                }
            }
            detail: {
                TabView {
                    let departureRecord = allDepartures.first {
                        $0.stop.id == selectedPlatform
                    }

                    if let departureRecord {
                        let filteredDepartures = allDepartures
                            .filter {
                                $0.stop.id == departureRecord.stop.id
                            }

                        VStack {
                            Label(
                                getShortenStationName(departureRecord.trip.headsign),
                                systemImage: "arrowshape.right.fill"
                            )
                            .font(.title2)
                            .padding(.bottom, 5)
                            CountdownView(countdownViewModel: CountdownViewModel(targetDateString: departureRecord.departureTimestamp.predicted)).font(.title)
                            HStack {
                                if filteredDepartures.count >= 2 {
                                    Text("Also in")
                                    CountdownView(countdownViewModel: CountdownViewModel(targetDateString: filteredDepartures[1].departureTimestamp.predicted))
                                }
                            }

                        }.containerBackground(
                            getLineColor(line: departureRecord.route.shortName).gradient,
                            for: .tabView
                        )

                        if filteredDepartures.count >= 2 {
                            List {
                                ForEach(allDepartures
                                    .filter {
                                        $0.stop.id == departureRecord.stop.id
                                    }.dropFirst()
                                ) {
                                    dep in
                                    HStack {
                                        Text(getShortenStationName(dep.trip.headsign))
                                        Spacer()
                                        CountdownView(countdownViewModel: CountdownViewModel(targetDateString: dep.departureTimestamp.predicted))
                                    }
                                }
                                .containerBackground(
                                    getLineColor(
                                        line: departureRecord.route.shortName
                                    )
                                    .gradient,
                                    for: .tabView
                                )
                            }
                        }
                    }
                }
                .tabViewStyle(.verticalPage)
                .navigationTitle(
                    getShortenStationName(
                        station?.name ?? String()
                    )
                )
                .toolbar {
                    let departureRecord = allDepartures.first {
                        $0.id == selectedDeparture
                    }

                    if let departureRecord {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button {} label: { Label(
                                "Metro Line \(departureRecord.route.shortName)", systemImage: "\(departureRecord.route.shortName.lowercased()).circle"
                            ) }
                            .foregroundStyle(
                                .white
                            )
                        }
                    }
                }
            }
        }
    }
}

#Preview {
    ContentView()
}
