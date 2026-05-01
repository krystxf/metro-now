// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SearchStopDetailHeaderBadge: View {
    let formattedDistance: String?
    let hasRealtimeData: Bool

    var body: some View {
        if formattedDistance != nil || hasRealtimeData {
            HStack(spacing: 8) {
                if let formattedDistance {
                    Label(formattedDistance, systemImage: "figure.walk")
                        .foregroundStyle(.secondary)
                }

                if hasRealtimeData {
                    Image(systemName: "antenna.radiowaves.left.and.right")
                        .symbolEffect(
                            .variableColor.cumulative.dimInactiveLayers.nonReversing,
                            options: .repeating
                        )
                        .foregroundStyle(.green)
                }
            }
            .font(.subheadline)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 20)
            .padding(.vertical, 6)
        }
    }
}

#Preview("Distance + realtime") {
    SearchStopDetailHeaderBadge(formattedDistance: "120 m", hasRealtimeData: true)
}

#Preview("Distance only") {
    SearchStopDetailHeaderBadge(formattedDistance: "340 m", hasRealtimeData: false)
}

#Preview("Realtime only") {
    SearchStopDetailHeaderBadge(formattedDistance: nil, hasRealtimeData: true)
}
