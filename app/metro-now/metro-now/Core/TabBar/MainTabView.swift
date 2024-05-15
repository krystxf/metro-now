//
//  MainTabView.swift
//  metro-now
//
//  Created by Kryštof Krátký on 15.05.2024.
//

import MapKit
import SwiftUI

struct MainTabView: View {
    @StateObject private var locationModel = LocationModel()
    let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        TabView {
            PlatformsListView()
                .tabItem {
                    Label("Near me", systemImage: "location.circle")
                }

            MapView()
                .tabItem {
                    Label("Map", systemImage: "map")
                }
        }
        .onReceive(locationModel.$location) { location in
            print("User's location: \(location)")
        }
        .onAppear {
            locationModel.checkLocationServicesEnabled()
        }
    }
}

#Preview {
    MainTabView()
}
