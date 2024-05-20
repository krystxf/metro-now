//
//  metro-now
//
//  Created by Kryštof Krátký on 20.05.2024.
//

import MapKit
import SwiftUI

struct MapMetroStationView: View {
    let metroLines: [String]

    var body: some View {
        ZStack {
            ForEach(Array(metroLines.enumerated()), id: \.0) {
                index, metroLine in
                let offset: CGFloat = index == 0 ? 0 : (-10 * CGFloat(index))

                Rectangle()
                    .foregroundStyle(.white)
                    .clipShape(.rect(cornerRadius: .infinity))
                    .offset(x: offset, y: offset)

                Image(
                    systemName:
                    getMetroLineIcon(metroLine)
                )
                .foregroundStyle(getMetroLineColor(metroLine))
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
            MapMetroStationView(
                metroLines: ["A"]
            )
        }
    }
}

#Preview("Two stations annotation") {
    Map {
        Annotation(
            "Random place on map", coordinate: CLLocationCoordinate2D(
                latitude: 50.113680, longitude: 14.449520)
        ) {
            MapMetroStationView(
                metroLines: ["A", "B"]
            )
        }
    }
}

// this is not very valid for Prague, but might be useful in the future
#Preview("Multiple stations annotation") {
    Map {
        Annotation(
            "Random place on map", coordinate: CLLocationCoordinate2D(
                latitude: 50.113680, longitude: 14.449520)
        ) {
            MapMetroStationView(
                metroLines: ["A", "B", "C", "A", "B", "C"]
            )
        }
    }
}
