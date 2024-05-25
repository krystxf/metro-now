//
//  Author: Kryštof Krátký
//

import SwiftUI
import WidgetKit

import CoreLocation

struct Provider: TimelineProvider {
    func placeholder(in _: Context) -> WidgetEntry {
        WidgetEntry(date: Date(), stationName: "Loading...", departures: [])
    }

    func getSnapshot(in _: Context, completion: @escaping (WidgetEntry) -> Void) {
        let entry = WidgetEntry(date: Date(), stationName: "Kacerov", departures: [])
        completion(entry)
    }

    func getTimeline(in _: Context, completion: @escaping (Timeline<WidgetEntry>) -> Void) {
        Task {
            let gtfsIDs = ["U286Z101P"]
            let departures = try! await getDeparturesByGtfsID(gtfsIDs: gtfsIDs)

            var entries: [WidgetEntry] = []
            var parsedDepartures: [WidgetEntryDeparture] = []

            for gtfsID in gtfsIDs {
                let dep = departures[gtfsID] ?? []

                let parsedDeparture = WidgetEntryDeparture(
                    departureDate: dep[0].departureTimestamp.predicted, direction: dep[0].trip.headsign, metroLine: dep[0].route.shortName
                )
                parsedDepartures.append(parsedDeparture)
            }

            let entry = WidgetEntry(date: .now, stationName: "Unkown", departures: parsedDepartures.map {
                WidgetEntryDeparture(
                    departureDate: $0.departureDate, direction: $0.direction, metroLine: $0.metroLine
                )
            })
            entries.append(entry)

            print(entries)

            let timeline = Timeline(entries: entries, policy: .atEnd)
            completion(timeline)
        }
    }
}
