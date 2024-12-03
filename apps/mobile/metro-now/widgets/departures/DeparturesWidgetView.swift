// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct DeparturesWidgetView: View {
    var entry: DeparturesWidgetTimelineProvider.Entry
    @Environment(\.widgetFamily) var widgetFamily

    var body: some View {
        VStack(alignment: .leading) {
            Text("Closest Metro Stop:")
                .font(.headline)
            Text(entry.closestStop)
                .font(.title2)
                .fontWeight(.bold)

            if let location = entry.location {
                Text("Current Location:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Text("Lat: \(location.coordinate.latitude, specifier: "%.4f"), Lon: \(location.coordinate.longitude, specifier: "%.4f")")
                    .font(.footnote)
            } else {
                Text("Location not available")
                    .font(.subheadline)
                    .foregroundColor(.red)
            }

            Divider()

            Text("Next Departures:")
                .font(.subheadline)
                .foregroundColor(.secondary)

            ForEach(entry.departures, id: \.self) { departure in
                Text(departure)
                    .font(.footnote)
            }

            Spacer()

            Text("Last refreshed: \(entry.date, style: .time)")
                .foregroundStyle(.tertiary)
                .font(.footnote)
        }
        .padding()
    }
}
