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





struct LargeWidgetListItemView: View {
    let routeName: String
    
    let headsign: String
    let departure: Date
    
    let nextHeadsing: String?
    let nextDeparture: Date?
    
    var body: some View {
        HStack{
            RouteNameIconView(
                label: routeName,
                background: getRouteColor(routeName)
            )
            
            VStack{
                HStack{
                    Text(headsign)
                     Spacer()
                    Text(departure,style: .offset)
                        .fontDesign(.monospaced)
                        .multilineTextAlignment(.trailing)
                }
                
             
                if let nextHeadsing, let nextDeparture {
                    
                    HStack{
                        Text(headsign == nextHeadsing ? "Also in" : nextHeadsing)
                        Spacer()
                        Text(nextDeparture,style: .offset)
                            .fontDesign(.monospaced)
                             .multilineTextAlignment(.trailing)
                        
                    }
                    .font(.caption)
                }
            }
        }
    }
}

struct WidgetsEntryPlaceholderView  : View {
    var entry: Provider.Entry
    
    var body: some View {
        Text("Muzeum")
            .font(.headline)
        
        VStack{
            LargeWidgetListItemView(
                routeName: "a",
                headsign: "D. Hostivar",
                departure: .now,
                nextHeadsing: "Skalka",
                nextDeparture: .now
            )
            Divider()
            LargeWidgetListItemView(
                routeName: "a",
                headsign: "N. Motol",departure: .now,
                nextHeadsing: "N. Motol",
                nextDeparture: .now
            )
            Divider()
            LargeWidgetListItemView(
                routeName: "c",
                headsign: "Letnany",departure: .now,
                nextHeadsing: "Letnany",
                nextDeparture: .now
            )
            Divider()
            LargeWidgetListItemView(
                routeName: "c",
                headsign: "Haje",departure: .now,
                nextHeadsing: "Kacerov",
                nextDeparture: .now
            )
            Divider()
            Spacer()
            
            Text("Last refreshed: \(entry.date, style: .time)")
                .foregroundStyle(.tertiary)
                .font(.footnote)
        }
    
             
    }
}

struct LargeWidgetView : View {
    var entry: Provider.Entry
    
    var body: some View {
        Text("Muzeum")
            .font(.headline)

        VStack{
            LargeWidgetListItemView(
                routeName: "a",
                headsign: "D. Hostivar",
                departure: .now,
                nextHeadsing: "Skalka",
                nextDeparture: .now
            )
            Divider()
            LargeWidgetListItemView(
                routeName: "a",
                headsign: "N. Motol",departure: .now,
                nextHeadsing: "N. Motol",
                nextDeparture: .now
            )
            Divider()
            LargeWidgetListItemView(
                routeName: "c",
                headsign: "Letnany",departure: .now,
                nextHeadsing: "Letnany",
                nextDeparture: .now
            )
            Divider()
            LargeWidgetListItemView(
                routeName: "c",
                headsign: "Haje",departure: .now,
                nextHeadsing: "Kacerov",
                nextDeparture: .now
            )
            Divider()
            Spacer()
            
            Text("Last refreshed: \(entry.date, style: .time)")
                .foregroundStyle(.tertiary)
                .font(.footnote)
        }
    }
}

struct widgetsEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var widgetFamily

    var body: some View {
        switch widgetFamily {
            case .systemLarge, .systemExtraLarge:
                LargeWidgetView(entry: entry)
            default:
                LargeWidgetView(entry: entry)
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
        .configurationDisplayName("Metro Departures")
        .description("Show metro departures from selected stop.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .systemExtraLarge
        ])
    }
}

#Preview("small", as: .systemSmall) {
    widgets()
} timeline: {
    SimpleEntry(date: .now)
}

#Preview("medium", as: .systemMedium) {
    widgets()
} timeline: {
    SimpleEntry(date: .now)
}

#Preview("large", as: .systemLarge) {
    widgets()
} timeline: {
    SimpleEntry(date: .now)
}
