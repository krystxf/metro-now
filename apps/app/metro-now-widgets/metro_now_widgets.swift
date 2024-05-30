//
//  Author: Kryštof Krátký
//

import MapKit
import SwiftUI
import WidgetKit

struct metro_now_widgets: Widget {
    let kind: String = "metro_now_widgets"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) {
            entry in
            WidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Departures")
        .description("Metro departures from nearest station")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

#Preview("Unsupported size", as: .systemExtraLarge) {
    metro_now_widgets()
} timeline: {
    WidgetEntry(date: .now, stationName: "Dejvická", departures: [])
}

#Preview("SM - No departures", as: .systemSmall) {
    metro_now_widgets()
} timeline: {
    WidgetEntry(date: .now, stationName: "Dejvická", departures: [])
}

#Preview("SM - One departure", as: .systemSmall) {
    metro_now_widgets()
} timeline: {
    WidgetEntry(date: .now, stationName: "Dejvická", departures: [
        WidgetEntryDeparture(
            departureDate: .now, direction: "Zličín", metroLine: "B"
        ),
    ])
}

#Preview("SM - Two departures", as: .systemSmall) {
    metro_now_widgets()
} timeline: {
    WidgetEntry(date: .now, stationName: "Kačerov", departures: [WidgetEntryDeparture(
        departureDate: .now, direction: "Háje", metroLine: "C"), WidgetEntryDeparture(
        departureDate: .now, direction: "Letňany", metroLine: "C")])
}

#Preview("SM - Three departures", as: .systemSmall) {
    metro_now_widgets()
} timeline: {
    WidgetEntry(date: .now, stationName: "Kačerov", departures: [WidgetEntryDeparture(
        departureDate: .now, direction: "Háje", metroLine: "C"), WidgetEntryDeparture(
        departureDate: .now, direction: "Letňany", metroLine: "C"), WidgetEntryDeparture(
        departureDate: .now, direction: "Zličín", metroLine: "B")])
}

#Preview("MD - No departures", as: .systemMedium) {
    metro_now_widgets()
} timeline: {
    WidgetEntry(date: .now, stationName: "Dejvická", departures: [])
}

#Preview("MD - One departure", as: .systemMedium) {
    metro_now_widgets()
} timeline: {
    WidgetEntry(date: .now, stationName: "Černý Most", departures: [
        WidgetEntryDeparture(
            departureDate: .now, direction: "Zličín", metroLine: "B"
        ),
    ])
}

#Preview("MD - Two departures", as: .systemMedium) {
    metro_now_widgets()
} timeline: {
    WidgetEntry(date: .now, stationName: "Kačerov", departures: [WidgetEntryDeparture(
        departureDate: .now, direction: "Háje", metroLine: "C"), WidgetEntryDeparture(
        departureDate: .now, direction: "Letňany", metroLine: "C")])
}

#Preview("MD - Three departures", as: .systemMedium) {
    metro_now_widgets()
} timeline: {
    WidgetEntry(date: .now, stationName: "Kačerov", departures: [WidgetEntryDeparture(
        departureDate: .now, direction: "Háje", metroLine: "C"), WidgetEntryDeparture(
        departureDate: .now, direction: "Letňany", metroLine: "C"), WidgetEntryDeparture(
        departureDate: .now, direction: "Zličín", metroLine: "B")])
}

#Preview("MD - Four departures", as: .systemMedium) {
    metro_now_widgets()
} timeline: {
    WidgetEntry(date: .now, stationName: "Florenc", departures: [WidgetEntryDeparture(
        departureDate: .now, direction: "Háje", metroLine: "C"), WidgetEntryDeparture(
        departureDate: .now, direction: "Letňany", metroLine: "C"), WidgetEntryDeparture(
        departureDate: .now, direction: "Zličín", metroLine: "B"), WidgetEntryDeparture(
        departureDate: .now, direction: "Černý Most", metroLine: "B")])
}

#Preview("LG - Four departures", as: .systemLarge) {
    metro_now_widgets()
} timeline: {
    WidgetEntry(date: .now, stationName: "Florenc", departures: [WidgetEntryDeparture(
        departureDate: .now, direction: "Háje", metroLine: "C"), WidgetEntryDeparture(
        departureDate: .now, direction: "Letňany", metroLine: "C"), WidgetEntryDeparture(
        departureDate: .now, direction: "Zličín", metroLine: "B"), WidgetEntryDeparture(
        departureDate: .now, direction: "Černý Most", metroLine: "B")])
}
