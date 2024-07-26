

import MapKit
import SwiftUI

struct MetroAnnotationStack: View {
    let metroLines: [String]

    var body: some View {
        ZStack {
            ForEach(Array(metroLines.enumerated()), id: \.0) {
                index, metroLine in
                let offset: CGFloat = index == 0 ? 0 : (-16 * CGFloat(index))

                MetroStationAnnotation(metroLine: metroLine)
                    .offset(x: offset, y: offset)
            }
        }
    }
}

#Preview("One station annotation") {
    Map {
        Annotation(
            "Random place on map", coordinate: CLLocationCoordinate2D(
                latitude: 50.113680, longitude: 14.449520)
        ) {
            MetroAnnotationStack(
                metroLines: ["A"]
            )
        }
    }
}
