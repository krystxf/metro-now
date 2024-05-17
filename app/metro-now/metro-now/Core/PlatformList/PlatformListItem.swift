//
//  PlatformListItem.swift
//  metro-now
//
//  Created by Kryštof Krátký on 14.05.2024.
//

import SwiftUI

struct PlatformListItemView: View {
    var direction: String
    var departure: String
    var metroLine: MetroLine
    var nextDeparture: String?

    var body: some View {
        HStack {
            Label(
                title: { Text(direction) },
                icon: { Image(systemName: getMetroLineIcon(metroLine)) }
            )
            .fontWeight(.bold)
            .font(.headline)
            .foregroundStyle(.white)

            Spacer()

            VStack {
                Text(departure)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                    .foregroundStyle(.white)
                if let nextDeparture {
                    Text(
                        "Also in \(nextDeparture)"
                    )
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                    .opacity(0.9)
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 10)
        .background(
            LinearGradient(colors: [
                getMetroLineColor(metroLine),
                getMetroLineColor(metroLine).opacity(0.8),
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing)
        )

        .clipShape(.rect(cornerRadius: 15))
    }
}

#Preview("Last train") {
    PlatformListItemView(
        direction: "Nemocnice Motol",
        departure: formatTime(seconds: 20),
        metroLine: MetroLine.A
    )
}

#Preview("Line A") {
    PlatformListItemView(
        direction: "Nemocnice Motol",
        departure: formatTime(seconds: 20),
        metroLine: MetroLine.A,
        nextDeparture: formatTime(seconds: 220)
    )
}

#Preview("Line B") {
    PlatformListItemView(
        direction: "Černý Most",
        departure: formatTime(seconds: 20),
        metroLine: MetroLine.B,
        nextDeparture: formatTime(seconds: 220)
    )
}

#Preview("Line C") {
    PlatformListItemView(
        direction: "Háje",
        departure: formatTime(seconds: 20),
        metroLine: MetroLine.C,
        nextDeparture: formatTime(seconds: 220)
    )
}
