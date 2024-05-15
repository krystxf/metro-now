//
//  MapView.swift
//  metro-now
//
//  Created by Kryštof Krátký on 15.05.2024.
//

import MapKit
import SwiftUI

struct MapView: View {
    var body: some View {
        Map {
            Marker(
                "Prague",
                coordinate: pragueCoordinates
            )
        }
    }
}

#Preview {
    MapView(
    )
}
