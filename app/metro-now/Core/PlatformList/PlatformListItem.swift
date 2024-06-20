//
//  metro-now
//
//  Created by Kryštof Krátký on 14.05.2024.
//

import SwiftUI

struct PlatformListItemView: View {
    @State var direction: String

    /// only first two items from array are shown
    /// this view doesn't handle logic of deciding which departures are outdated (shouldn't be shown)
    @State var departureDates: [Date]

    /// time until departure in human readable form
    @State private var departureStrings: [String] = []

    @State var metroLine: String
    private let timer = Timer.publish(every: 0.1, on: .main, in: .common).autoconnect()

    @State private var deltatime: Double = 0

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
                if departureStrings.count >= 1 {
                    Text(departureStrings[0])
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                        .foregroundStyle(.white)
                }
                if departureStrings.count >= 2 {
                    Text(
                        "Also in \(departureStrings[1])"
                    )
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                    .opacity(0.9)
                }
            }
        }
        .onReceive(timer) {
            _ in
            guard departureDates.count > 0 else { return }

            if departureDates.count >= 2 {
                departureStrings = departureDates[0 ..< 2].map {
                    formatTime(seconds: secondsFromNow($0))
                }
            } else {
                departureStrings = [
                    formatTime(seconds: secondsFromNow(departureDates[0])),
                ]
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 10)
        .background(
            LinearGradient(
                colors: [
                    getMetroLineColor(metroLine),
                    getMetroLineColor(metroLine).opacity(0.8),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )

        .clipShape(.rect(cornerRadius: 15))
    }
}
