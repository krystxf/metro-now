
import MapKit
import SwiftUI

struct BusStationAnnotation: View {
    var body: some View {
        Image(
            systemName: "bus"
        )
        .imageScale(.small)
        .padding(2)
        .font(.system(size: 16))
        .foregroundStyle(.white)
        .background(.blue)
        .clipShape(.rect(cornerRadius: 4))
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(.white, lineWidth: 2)
        )
    }
}

#Preview("Bus station annotation") {
    Map {
        Annotation(
            "Random place on map", coordinate: CLLocationCoordinate2D(
                latitude: 50.113680, longitude: 14.449520)
        ) {
            BusStationAnnotation(
            )
        }
    }
}
