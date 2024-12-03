// metro-now
// https://github.com/krystxf/metro-now

import WidgetKit

struct FrequencyWidgetTimelineProvider: TimelineProvider {
    private let stopManager = FrequencyWidgetManager()

    func placeholder(in _: Context) -> FrequencyWidgetTimelineEntry {
        FrequencyWidgetTimelineEntry(date: Date(), stopName: "Muzeum", frequency: 2 * 60)
    }

    func getSnapshot(in _: Context, completion: @escaping (FrequencyWidgetTimelineEntry) -> Void) {
        let entry = FrequencyWidgetTimelineEntry(
            date: Date(),
            stopName: "Muzeum",
            frequency: 2 * 60
        )

        completion(entry)
    }

    func getTimeline(
        in _: Context,
        completion: @escaping (Timeline<FrequencyWidgetTimelineEntry>) -> Void
    ) {
        // Wait for data to be fetched
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak stopManager] in
            guard let stopManager,
                  let closestStop = stopManager.closestMetroStop
            else {
                let entry = FrequencyWidgetTimelineEntry(
                    date: Date(),
                    stopName: "Loading",
                    frequency: 0
                )

                let timeline = Timeline(entries: [entry], policy: .atEnd)
                completion(timeline)
                return
            }

            let closestStopMetroPlatforms = closestStop.platforms.filter(\.isMetro)
            let metroDepartures = stopManager.nearestDepartures.filter { departure in
                closestStopMetroPlatforms.contains { platform in
                    departure.platformId == platform.id
                }
            }

            // If there are fewer than two departures, return early with a default entry
            guard metroDepartures.count > 1 else {
                let entry = FrequencyWidgetTimelineEntry(
                    date: Date(),
                    stopName: closestStop.name,
                    frequency: 0
                )

                let timeline = Timeline(entries: [entry], policy: .atEnd)
                completion(timeline)
                return
            }

            // Group departures by platformId
            let groupedDepartures = Dictionary(grouping: metroDepartures, by: { $0.platformId })

            // Calculate average frequency per platform
            var platformFrequencies: [String: Double] = [:]

            for (platformId, platformDepartures) in groupedDepartures {
                // Sort departures for the current platform by predicted time
                let sortedDepartures = platformDepartures.sorted {
                    $0.departure.predicted < $1.departure.predicted
                }

                // Exclude the nearest departure (first departure in sorted order)
                let departuresToConsider = sortedDepartures.dropFirst()

                // Calculate the average frequency for this platform
                let intervals = zip(departuresToConsider, departuresToConsider.dropFirst()).map {
                    $1.departure.predicted.timeIntervalSince($0.departure.predicted)
                }
                let averageFrequency = intervals.isEmpty ? 0 : intervals.reduce(0, +) / Double(intervals.count)

                platformFrequencies[platformId] = averageFrequency
            }

            // Combine frequencies to calculate the overall average frequency across all platforms
            let averageFrequencyAcrossPlatforms = platformFrequencies.values.reduce(0, +) / Double(platformFrequencies.count)

            // Create timeline entries for each departure with the calculated average frequency
            var entries: [FrequencyWidgetTimelineEntry] = []

            for departure in metroDepartures {
                let frequency = averageFrequencyAcrossPlatforms
                let entry = FrequencyWidgetTimelineEntry(
                    date: departure.departure.predicted,
                    stopName: closestStop.name,
                    frequency: frequency
                )
                entries.append(entry)
            }

            print("entries")
            print(entries.count)

            // Finalize the timeline with all entries
            let timeline = Timeline(entries: entries, policy: .atEnd)
            completion(timeline)
        }
    }
}
