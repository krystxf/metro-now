
import MapKit
import SwiftUI

struct StationLocationMapView: View {
    let stationName: String
    let station: MetroStationsGeoJSONFeature
    let stationCoordinate: CLLocationCoordinate2D
    let distanceFormatter = MKDistanceFormatter()
    @StateObject private var locationModel = LocationModel()
    @State var distance: Double = -1

    init(stationName: String) {
        self.stationName = stationName
        let stations: MetroStationsGeoJSON = getParsedJSONFile(.METRO_STATIONS_FILE)!
        station = stations.features.first(where: { $0.properties.name == stationName })!
        stationCoordinate = CLLocationCoordinate2D(latitude: station.geometry.coordinates[1], longitude: station.geometry.coordinates[0])
    }

    var body: some View { ScrollView {
        ZStack {
            Text("Map")
                .hidden()
                .frame(height: 350)
                .frame(maxWidth: .infinity)
        }

        .background(alignment: .bottom) {
            Map {
                Marker(stationName, coordinate: stationCoordinate)
            }

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
                Button(action: {}) {
                    Label("Navigate", systemImage: "figure.walk.circle.fill")
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }
                if distance > -1 {
                    VStack(alignment: .leading) {
                        Text("DISTANCE")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Label {
                            Text(distanceFormatter.string(fromDistance: distance))
                        } icon: {
                            Image(systemName: "point.topleft.down.to.point.bottomright.curvepath")
                                .foregroundColor(.secondary)
                        }
                    }
                }
                Spacer()
            }

            HStack {
                Text("Departures")
                    .font(.headline)
                Spacer()
            }
        }
        .padding()
    }
    .navigationTitle(stationName)
    .onReceive(locationModel.$location) { location in

        guard let location else {
            print("Unknown location")
            return
        }
        print("User's location: \(location)")

        let userLocation = CLLocation(latitude: location.coordinate.latitude, longitude: location.coordinate.longitude)
        let stationLocation = CLLocation(latitude: stationCoordinate.latitude, longitude: stationCoordinate.longitude)
        distance = userLocation.distance(from: stationLocation)
    }
    }
}

#Preview {
    StationLocationMapView(
        stationName: "I. P. Pavlova"
    )
}
