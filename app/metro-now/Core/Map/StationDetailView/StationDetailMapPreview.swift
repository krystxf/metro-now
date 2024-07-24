
import MapKit
import SwiftUI

struct StationDetailMapPreview: View {
    let centerPoint: CLLocationCoordinate2D

    init(_ centerPoint: CLLocationCoordinate2D) {
        self.centerPoint = centerPoint
    }

    var body: some View {
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
                        latitude: centerPoint.latitude,
                        longitude: centerPoint.longitude
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
}

#Preview {
    StationDetailMapPreview(
        CLLocationCoordinate2D(latitude: 50.090825, longitude: 14.439524)
    )
}
