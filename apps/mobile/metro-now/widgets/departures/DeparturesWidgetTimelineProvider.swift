// metro-now
// https://github.com/krystxf/metro-now

import WidgetKit

struct DeparturesWidgetTimelineProvider: TimelineProvider {
    private let stopManager = DeparturesWidgetManager()

    func placeholder(in _: Context) -> DeparturesWidgetTimelineEntry {
        DeparturesWidgetTimelineEntry(date: Date(), closestStop: "Loading...", departures: [], location: nil)
    }

    func getSnapshot(in _: Context, completion: @escaping (DeparturesWidgetTimelineEntry) -> Void) {
        let entry = DeparturesWidgetTimelineEntry(date: Date(), closestStop: "Loading...", departures: [], location: nil)
        completion(entry)
    }

    func getTimeline(in _: Context, completion: @escaping (Timeline<DeparturesWidgetTimelineEntry>) -> Void) {
        // Wait for data to be fetched
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak stopManager] in
            guard let stopManager,
                  let closestStop = stopManager.closestMetroStop,
                  let location = stopManager.location
            else {
                let entry = DeparturesWidgetTimelineEntry(date: Date(), closestStop: "Unknown", departures: [], location: nil)
                let timeline = Timeline(entries: [entry], policy: .atEnd)
                completion(timeline)
                return
            }

            let departures = stopManager.nearestDepartures.map { departure in
                "\(departure.route) to \(departure.headsign) at \(formattedDepartureTime(departure.departure.predicted))"
            }

            // Create a timeline entry
            let entry = DeparturesWidgetTimelineEntry(
                date: Date(),
                closestStop: closestStop.name,
                departures: departures,
                location: location
            )

            let timeline = Timeline(entries: [entry], policy: .atEnd)
            completion(timeline)
        }
    }

    private func formattedDepartureTime(_ departureDate: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: departureDate)
    }
}
