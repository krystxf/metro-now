// metro-now
// https://github.com/krystxf/metro-now

import WidgetKit

struct FrequencyWidgetTimelineEntry: TimelineEntry {
    let date: Date
    let stopName: String
    let frequency: TimeInterval // in seconds
}
