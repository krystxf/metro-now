//
//  PlatformListView.swift
//  metro-now
//
//  Created by Kryštof Krátký on 14.05.2024.
//

import SwiftUI

struct PlatformsListView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 10) {
                    ForEach(0 ... 4, id: \.self) { platform in
                        NavigationLink(value: platform) {
                            PlatformListItemView(
                                direction: "Háje",
                                departure: formatTime(seconds: 20)
                            )
                        }
                    }
                }
                .padding(20)
            }
            .navigationDestination(for: Int.self) {
                _ in
                PlatformDetailView(
                    direction: "Háje"
                )
            }
        }
    }
}

#Preview {
    PlatformsListView()
}
