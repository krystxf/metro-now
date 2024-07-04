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

    @State var metroLine: String

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
                if departureDates.count >= 1 {
                    Text(
                        .currentDate, format: .reference(to: departureDates[0], allowedFields: [.second, .minute, .hour])
                    )
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                    .foregroundStyle(.white)
                }
                if departureDates.count >= 2 {
                    Text(
                        "Also in "
                    ).font(.caption2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                        .opacity(0.9)
                    Text(
                        .currentDate, format: .reference(to: departureDates[1], allowedFields: [.second, .minute, .hour])
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
