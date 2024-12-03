// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI
import WidgetKit

struct FrequencyWidget: Widget {
    let kind: String = "Widgets"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FrequencyWidgetTimelineProvider()) { entry in
            if #available(iOS 17.0, *) {
                FrequencyWidgetView(entry: entry)
                    .containerBackground(.background, for: .widget)
            } else {
                FrequencyWidgetView(entry: entry)
                    .padding()
                    .background()
            }
        }
        .configurationDisplayName("Metro Frequency")
        .description("Show the frequency of metro departures.")
        .supportedFamilies([.systemSmall])
    }
}

#Preview("One metro line", as: .systemSmall) {
    FrequencyWidget()
} timeline: {
    FrequencyWidgetTimelineEntry(
        date: .now,
        stopName: "Muzeum",
        frequency: 2 * 60
    )
}
