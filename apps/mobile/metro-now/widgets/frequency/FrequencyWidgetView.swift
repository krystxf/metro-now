// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct FrequencyWidgetView: View {
    private var entry: FrequencyWidgetTimelineProvider.Entry
    private let formatter: DateComponentsFormatter

    init(entry: FrequencyWidgetTimelineProvider.Entry) {
        self.entry = entry
        formatter = DateComponentsFormatter()

        formatter.unitsStyle = .brief
        formatter.allowedUnits = [.hour, .minute, .second]
        formatter.maximumUnitCount = 2
    }

    var body: some View {
        VStack(alignment: .leading) {
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.stopName)
                    .font(.headline)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            VStack(spacing: 6) {
                Text("Every")
                Text(
                    formatter.string(from: entry.frequency)!
                )
                .font(.title3)
                .fontWeight(.bold)
            }
            .padding(.vertical)
            .frame(maxWidth: .infinity, alignment: .center)

            Spacer()
        }
    }
}
