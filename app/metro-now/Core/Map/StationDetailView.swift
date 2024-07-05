import MapKit
import SwiftUI

struct StationDetailView: View {
    let showMap: Bool
    let stationName: String
    let station: MetroStationsGeoJSONFeature
    let stationCoordinate: CLLocationCoordinate2D
    let distanceFormatter = MKDistanceFormatter()
    let mapUrl: URL?

    @State private var isFavourite: Bool = false
    @State private var trigger = false
    @StateObject private var locationModel = LocationModel()
    @State var distance: Double = -1
    @State private var departures: GroupedDepartures = [:]
    @State private var errorMessage: String?

    init(stationName: String, showMap: Bool = false, showDirection: Bool = false) {
        self.stationName = stationName
        self.showMap = showMap

        let stations: MetroStationsGeoJSON = getParsedJSONFile(.METRO_STATIONS_FILE)!
        station = stations.features.first(where: { $0.properties.name == stationName })!
        stationCoordinate = CLLocationCoordinate2D(
            latitude: station.geometry.coordinates[1],
            longitude: station.geometry.coordinates[0]
        )

        mapUrl = showDirection ? URL(
            string:
            "maps://?saddr=&daddr=\(stationCoordinate.latitude),\(stationCoordinate.longitude)"
        ) : nil
    }

    var body: some View {
        ScrollView {
            if showMap {
                ZStack {
                    Text("Map")
                        .hidden()
                        .frame(height: 150)
                        .frame(maxWidth: .infinity)
                }
                .background(alignment: .bottom) {
                    TimelineView(.animation) { context in
                        let seconds = context.date.timeIntervalSince1970

                        DetailedMapView(
                            location: CLLocation(
                                latitude: stationCoordinate.latitude,
                                longitude: stationCoordinate.longitude
                            ),
                            distance: 500,
                            pitch: 30,
                            heading: seconds * 6
                        )
                        .mask {
                            LinearGradient(
                                stops: [
                                    .init(color: .clear, location: 0),
                                    .init(color: .black.opacity(0.15), location: 0.1),
                                    .init(color: .black, location: 0.6),
                                    .init(color: .black, location: 1),
                                ],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        }
                        .padding(.top, -150)
                    }
                }

                .ignoresSafeArea(edges: .top)
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

                    ForEach(Array(departures.keys), id: \.self) { k in
                        let d = departures[k]!

                        if d.count > 0 {
                            PlatformListItemView(
                                direction: d[0].heading,
                                departureDates: d.map(\.departure),
                                metroLine: d[0].line
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
        }.refreshable {
            do {
                departures = try await getDepartures(stations: [stationName], groupBy: .heading)
            } catch {
                errorMessage = "Failed to fetch departures: \(error)"
            }
        }
        .onAppear {
            Task {
                do {
                    departures = try await
                        (getDepartures(stations: [stationName], groupBy: .heading))
                } catch {
                    errorMessage = "Failed to fetch departures: \(error)"
                }
            }
        }
        .task {
            trigger.toggle()
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
