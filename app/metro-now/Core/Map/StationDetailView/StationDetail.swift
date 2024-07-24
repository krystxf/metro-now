import MapKit
import SwiftUI

let MIN_UPDATE_INTERVAL: Double = 1

struct StationDetailView: View {
    let showMap: Bool
    let stationName: String
    let station: MetroStationsGeoJSONFeature
    let stationCoordinate: CLLocationCoordinate2D
    let distanceFormatter = MKDistanceFormatter()
    let mapUrl: URL?
    let timer = Timer.publish(every: 2, on: .main, in: .common).autoconnect()

    @State private var isFavourite: Bool = false
    @StateObject private var locationModel = LocationModel()
    @State var distance: Double = -1
    @State private var departures: [String: [ApiDeparture]] = [:]
    @State private var errorMessage: String?
    @State private var lastUpdate: Date? = nil

    func updateDepartures(ignoreMinDelay: Bool = false) async {
        guard ignoreMinDelay || (lastUpdate == nil || lastUpdate!.timeIntervalSinceNow < -MIN_UPDATE_INTERVAL) else {
            #if DEBUG
                print("GET blocked - min delay")
            #endif
            return
        }

        #if DEBUG
            if ignoreMinDelay {
                print("GET ignored min delay")
            }
        #endif

        do {
            let departuresArr = try await getDepartures(stations: [stationName])
            let upcomingDeparturesArr = departuresArr.filter {
                $0.departure.timeIntervalSinceNow > 1000
            }.sorted(by: {
                $0.platform < $1.platform
            })

            departures = Dictionary(
                grouping: upcomingDeparturesArr,
                by: { $0.platform }
            )

            lastUpdate = .now
        } catch {
            #if DEBUG
                errorMessage = "Failed to fetch departures: \(error)"
            #endif
        }
    }

    init(stationName: String, showMap: Bool = false, showDirection: Bool = false) {
        self.stationName = stationName
        self.showMap = showMap

        let stations: MetroStationsGeoJSON = getParsedJSONFile(.METRO_STATIONS_FILE)!
        station = stations.features.first(where: { $0.properties.name == stationName })!
        stationCoordinate = CLLocationCoordinate2D(
            latitude: station.geometry.coordinates[1],
            longitude: station.geometry.coordinates[0]
        )

        mapUrl =
            showDirection
                ? URL(
                    string:
                    "maps://?saddr=&daddr=\(stationCoordinate.latitude),\(stationCoordinate.longitude)"
                ) : nil
    }

    var body: some View {
        ScrollView {
            if showMap {
                StationDetailMapPreview(stationCoordinate)
            }

            VStack(spacing: 20) {
                if let mapUrl, UIApplication.shared.canOpenURL(mapUrl) {
                    HStack(spacing: 20) {
                        Button(action: {
                            UIApplication.shared.open(mapUrl, options: [:], completionHandler: nil)

                        }) {
                            Label(
                                distance > -1
                                    ? distanceFormatter.string(fromDistance: distance)
                                    : "Directions",
                                systemImage: "arrow.triangle.turn.up.right.circle.fill"
                            )
                            .padding()
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                        }

                        Spacer()
                    }
                }

                VStack(spacing: 10) {
                    HStack {
                        Text("Departures")
                            .font(.headline)
                        Spacer()
                    }

                    ForEach(Array(departures.keys).sorted { $0 < $1 }, id: \.self) { k in
                        let d = departures[k]!

                        if d.count > 0 {
                            MetroDeparture(
                                metroLine: d[0].line,
                                direction: d[0].heading,
                                departures: d
                            )
                        }
                    }
                }
            }
            .padding()
        }
        .navigationTitle(stationName)
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(.thinMaterial, for: .navigationBar)
        .toolbarBackground(.automatic, for: .navigationBar)
        .toolbar {
            Button(action: {
                isFavourite.toggle()
            }) {
                Image(systemName: isFavourite ? "heart.fill" : "heart")
                    .foregroundColor(isFavourite ? .red : .black)
            }
        }
        .onReceive(timer) { _ in
            Task {
                await updateDepartures()
            }
        }
        .onReceive(locationModel.$location) { location in
            guard let location else {
                print("Unknown location")
                return
            }
            print("User's location: \(location)")

            let userLocation = CLLocation(
                latitude: location.coordinate.latitude,
                longitude: location.coordinate.longitude
            )
            let stationLocation = CLLocation(
                latitude: stationCoordinate.latitude,
                longitude: stationCoordinate.longitude
            )

            distance = userLocation.distance(from: stationLocation)

            Task {
                await updateDepartures()
            }
        }.refreshable {
            await updateDepartures(ignoreMinDelay: true)
        }
        .onAppear {
            Task {
                await updateDepartures()
            }
        }
    }
}

#Preview("With Map") {
    NavigationStack {
        StationDetailView(
            stationName: "Muzeum",
            showMap: true
        )
    }
}

#Preview("With Map and Directions") {
    NavigationStack {
        StationDetailView(
            stationName: "Muzeum",
            showMap: true,
            showDirection: true
        )
    }
}

#Preview("With Directions") {
    NavigationStack {
        StationDetailView(
            stationName: "Muzeum",
            showDirection: true
        )
    }
}

#Preview("Muzeum") {
    NavigationStack {
        StationDetailView(
            stationName: "Muzeum"
        )
    }
}

#Preview("Kačerov") {
    NavigationStack {
        StationDetailView(
            stationName: "Kačerov"
        )
    }
}

#Preview("Florenc") {
    NavigationStack {
        StationDetailView(
            stationName: "Florenc"
        )
    }
}

#Preview("I. P. Pavlova") {
    NavigationStack {
        StationDetailView(
            stationName: "I. P. Pavlova"
        )
    }
}
