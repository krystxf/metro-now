// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct RoutePreviewCurrentDistanceHeader: View {
    let distanceMeters: Double
    let currentPlatform: ApiRoutePlatform?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(
                Measurement(value: distanceMeters, unit: UnitLength.meters).formatted(
                    .measurement(
                        width: .abbreviated,
                        usage: .road,
                        numberFormatStyle: .number.precision(.fractionLength(0))
                    )
                )
            )
            .font(.title3)
            .fontWeight(.semibold)

            if let currentPlatform {
                Text("to \(platformLabel(currentPlatform))")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
    }

    private func platformLabel(_ platform: ApiRoutePlatform) -> String {
        if let code = platform.code {
            return "\(platform.name) \(code)"
        }
        return platform.name
    }
}

#Preview {
    RoutePreviewCurrentDistanceHeader(
        distanceMeters: 432,
        currentPlatform: RoutePreviewPreviewData.samplePlatform
    )
}
