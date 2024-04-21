//
//  LoadingView.swift
//  MetroMate
//
//  Created by Kryštof Krátký on 31.03.2024.
//

import SwiftUI

struct LoadingView: View {
    var stationName: String?

    var body: some View {
        NavigationView {
            ProgressView()
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) { NavigationLink {
                        SettingsView()
                    } label: {
                        Label(
                            "Settings", systemImage: "gear"
                        )
                    }
                    .navigationTitle(getShortenStationName(stationName ?? String()))
                    }
                }
        }
    }
}

#Preview {
    LoadingView(
        stationName: "Hlavní nádraží")
}
