//
//  RequestAccessToLocationView.swift
//  MetroMate
//
//  Created by Kryštof Krátký on 31.03.2024.
//

import SwiftUI

let DESCRIPTION = "App needs access to your location to determine closest metro station"

struct RequestAccessToLocationView: View {
    @ObservedObject var locationManager = LocationManager.shared

    var body: some View {
        VStack {
            Text(DESCRIPTION).font(.caption2)

            Spacer().frame(height: 20)

            Button {
                LocationManager.shared.requestLocation()
            } label: {
                Label("Allow", systemImage: "location.circle")
            }
            .tint(.blue)
        }
    }
}

#Preview {
    RequestAccessToLocationView()
}
