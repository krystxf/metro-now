import MapKit
import SwiftUI

struct StationLocationMapView: View {
    let stationName: String
    let station: MetroStationsGeoJSONFeature
    let stationCoordinate: CLLocationCoordinate2D
    let distanceFormatter = MKDistanceFormatter()
    let mapUrl: URL
    @StateObject private var locationModel = LocationModel()
    @State var distance: Double = -1
    @State private var departures: GroupedDepartures = [:]
    @State private var errorMessage: String?
    @State private var cameraPosition: MapCameraPosition = .camera(
        .init(centerCoordinate: CLLocationCoordinate2D(latitude: 0, longitude: 0), distance: 500, pitch: 60)
    )
    init(stationName: String) {
        self.stationName = stationName

        let stations: MetroStationsGeoJSON = getParsedJSONFile(.METRO_STATIONS_FILE)!
        station = stations.features.first(where: { $0.properties.name == stationName })!
        stationCoordinate = CLLocationCoordinate2D(
            latitude: station.geometry.coordinates[1],
            longitude: station.geometry.coordinates[0]
        )
        mapUrl = URL(
            string:
            "maps://?saddr=&daddr=\(stationCoordinate.latitude),\(stationCoordinate.longitude)"
        )!
        cameraPosition = .camera(
            MapCamera(centerCoordinate: stationCoordinate, distance: 500, pitch: 60)
        )
    }

    var body: some View {
        ScrollView {
            ZStack {
                Text("Map")
                    .hidden()
                    .frame(height: 350)
                    .frame(maxWidth: .infinity)
            }

            .background(alignment: .bottom) {
                Map(position: $cameraPosition) {
                    Marker(stationName, coordinate: stationCoordinate)
                }
                .mapStyle(.imagery(elevation: .realistic))
                .mapControlVisibility(.hidden)
                .disabled(true)
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
            .ignoresSafeArea(edges: .top)
            VStack(spacing: 20) {
                HStack(spacing: 20) {
                    if UIApplication.shared.canOpenURL(mapUrl) {
                        Button(action: {
                            UIApplication.shared.open(mapUrl, options: [:], completionHandler: nil)

                        }) {
                            Label("Navigate", systemImage: "figure.walk.circle.fill")
                                .padding()
                                .background(Color.blue)
                                .foregroundColor(.white)
                                .cornerRadius(8)
                        }
                    }
                    if distance > -1 {
                        VStack(alignment: .leading) {
                            Text("DISTANCE")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Label {
                                Text(distanceFormatter.string(fromDistance: distance))
                            } icon: {
                                Image(
                                    systemName: "point.topleft.down.to.point.bottomright.curvepath"
                                )
                                .foregroundColor(.secondary)
                            }
                        }
                    }
                    Spacer()
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
    }
}

#Preview("Muzeun") {
    NavigationStack {
        StationLocationMapView(
            stationName: "Muzeum"
        )
    }
}

#Preview("Florenc") {
    NavigationStack {
        StationLocationMapView(
            stationName: "Florenc"
        )
    }
}

#Preview("I. P. Pavlova") {
    NavigationStack {
        StationLocationMapView(
            stationName: "I. P. Pavlova"
        )
    }
}
