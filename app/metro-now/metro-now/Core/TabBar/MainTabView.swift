//
//  MainTabView.swift
//  metro-now
//
//  Created by Kryštof Krátký on 15.05.2024.
//

import SwiftUI

struct MainTabView: View {
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
    }
}

#Preview {
    MainTabView()
}
