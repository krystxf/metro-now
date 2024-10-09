//
//  Author: Kryštof Krátký
//

import SwiftUI
import WidgetKit

import CoreLocation

struct Provider: TimelineProvider {
    func placeholder(in _: Context) -> WidgetEntry {
        WidgetEntry(date: Date(), stationName: "Loading...", departures: Array(
            repeating: WidgetEntryDeparture(departureDate: Date(), direction: "Loading...", metroLine: "A"),
            count: 4))
    }

    func getSnapshot(in _: Context, completion: @escaping (WidgetEntry) -> Void) {
        let closestStation = getClosestStationFromGeoJSON(location: FLORENC_COORDINATES)

        Task {
            let gtfsIDs = closestStation.properties.platforms.map(\.gtfsId)
            let departures = await (try! getDepartures(gtfsIDs: gtfsIDs, groupBy: .platform))

            var parsedDepartures: [WidgetEntryDeparture] = []

            for gtfsID in gtfsIDs {
                let dep = departures[gtfsID] ?? []

                let parsedDeparture = WidgetEntryDeparture(
                    departureDate: dep[0].departure, direction: dep[0].heading, metroLine: dep[0].line
                )
                parsedDepartures.append(parsedDeparture)
            }

            let entry = WidgetEntry(
                date: .now,
                stationName: closestStation.properties.name,
                departures: parsedDepartures.map {
                    WidgetEntryDeparture(
                        departureDate: $0.departureDate, direction: $0.direction, metroLine: $0.metroLine
                    )
                }
            )
            completion(entry)
        }
    }

    func getTimeline(in _: Context, completion: @escaping (Timeline<WidgetEntry>) -> Void) {
        let locationManager = CLLocationManager()
        locationManager.requestWhenInUseAuthorization()

        let currentLocation = locationManager.location

        guard let currentLocation else {
            var entries: [WidgetEntry] = []
            let timeline = Timeline(entries: entries, policy: .atEnd)
            completion(timeline)
            return
        }

        let closestStation = getClosestStationFromGeoJSON(
            location: CLLocation(
                latitude: currentLocation.coordinate.latitude,
                longitude: currentLocation.coordinate.longitude
            ))

        Task {
            let gtfsIDs = closestStation.properties.platforms.map(\.gtfsId)
            let departures = await (try! getDepartures(gtfsIDs: gtfsIDs, groupBy: .platform))

            var entries: [WidgetEntry] = []
            var parsedDepartures: [WidgetEntryDeparture] = []

            for gtfsID in gtfsIDs {
                let dep = departures[gtfsID] ?? []

                let parsedDeparture = WidgetEntryDeparture(
                    departureDate: dep[0].departure, direction: dep[0].heading, metroLine: dep[0].line
                )
                parsedDepartures.append(parsedDeparture)
            }

            let entry = WidgetEntry(date: .now, stationName: closestStation.properties.name, departures: parsedDepartures.map {
                WidgetEntryDeparture(
                    departureDate: $0.departureDate, direction: $0.direction, metroLine: $0.metroLine
                )
            })
            entries.append(entry)

            let timeline = Timeline(entries: entries, policy: .atEnd)
            completion(timeline)
        }
    }
}
