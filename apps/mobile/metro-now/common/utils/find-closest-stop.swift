// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import SwiftUI

func findClosestStop(to location: CLLocation, stops: [ApiStop]) -> ApiStop? {
    var closestStop: ApiStop?
    var closestDistance: CLLocationDistance?

    for stop in stops {
        let distance = getStopDistance(location, stop)

        guard closestDistance != nil else {
            closestStop = stop
            closestDistance = distance
            continue
        }

        if distance < closestDistance! {
            closestStop = stop
            closestDistance = distance
        }
    }

    return closestStop
}

func getStopDistance(
    _ location: CLLocation,
    _ stop: ApiStop
) -> CLLocationDistance {
    location.distance(
        from: CLLocation(
            latitude: stop.avgLatitude,
            longitude: stop.avgLongitude
        )
    )
}
