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
    var nextDeparture: String?

    var body: some View {
        HStack {
            Text(direction)
                .bold()

            Spacer()

            VStack {
                Text(departure).bold()
                if let nextDeparture {
                    Text("Next in \(nextDeparture)")
                        .font(.caption2)
                        .foregroundStyle(.gray)
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 10)
    }
}

#Preview {
    PlatformListItemView(
        direction: "Háje",
        departure: "20s",
        nextDeparture: "2m 20s"
    )
}
