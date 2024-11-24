// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI
import WidgetKit

struct Provider: TimelineProvider {
    func placeholder(in _: Context) -> SimpleEntry {
        SimpleEntry(date: Date())
    }

    func getSnapshot(in _: Context, completion: @escaping (SimpleEntry) -> Void) {
        let entry = SimpleEntry(date: Date())
        completion(entry)
    }

    func getTimeline(in _: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        var entries: [SimpleEntry] = []

        // Generate a timeline consisting of five entries an hour apart, starting from the current date.
        let currentDate = Date()
        for hourOffset in 0 ..< 5 {
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            let entry = SimpleEntry(date: entryDate)
            entries.append(entry)
        }

        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
}

struct widgetsEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var widgetFamily

    var body: some View {
        VStack {
            Text("🚇 metro-now")
                .font(.headline)
            Text("coming soon")
                .font(.subheadline)

            Spacer()
            VStack {
                Text(widgetFamily.description.lowercased())
                Text("Last update: ") + Text(entry.date, style: .time)
            }
            .font(.footnote)
        }
    }
}

struct widgets: Widget {
    let kind: String = "widgets"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                widgetsEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                widgetsEntryView(entry: entry)
                    .padding()
                    .background()
            }
        }
        .configurationDisplayName("My Widget")
        .description("This is an example widget.")
    }
}

#Preview("small", as: .systemSmall) {
    widgets()
} timeline: {
    SimpleEntry(date: .now)
    SimpleEntry(date: .now)
}

#Preview("medium", as: .systemMedium) {
    widgets()
} timeline: {
    SimpleEntry(date: .now)
    SimpleEntry(date: .now)
}

#Preview("large", as: .systemLarge) {
    widgets()
} timeline: {
    SimpleEntry(date: .now)
    SimpleEntry(date: .now)
}

#Preview("extra large", as: .systemExtraLarge) {
    widgets()
} timeline: {
    SimpleEntry(date: .now)
    SimpleEntry(date: .now)
}
