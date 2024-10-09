//
//  MainTabView.swift
//  metro-now
//
//  Created by Kryštof Krátký on 15.05.2024.
//

import MapKit
import SwiftUI
import WidgetKit

struct MainTabView: View {
    @StateObject private var locationModel = LocationModel()
    @State var closestStation: MetroStationsGeoJSONFeature?
    let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        TabView {
            if let closestStation {
                NavigationStack {
                    StationDetailView(stationName: closestStation.properties.name)
                }
                .tabItem {
                    Label("Near me", systemImage: "tram.fill.tunnel")
                }
            }

            MapView()
                .tabItem {
                    Label("Map", systemImage: "map")
                }
        }
        .onReceive(locationModel.$location) { location in
            guard let location else {
                print("Unknown location")
                return
            }
            print("User's location: \(location)")

            WidgetCenter.shared.reloadAllTimelines()
            let res = getClosestStationFromGeoJSON(location: location)

            closestStation = res
        }
        .onAppear {
            locationModel.checkLocationServicesEnabled()
        }
    }
}

#Preview {
    MainTabView()
}
