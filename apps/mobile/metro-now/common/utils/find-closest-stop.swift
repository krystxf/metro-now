// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import SwiftUI

func findClosestStop(to location: CLLocation, stops: [ApiStop]) -> ApiStop? {
    var closestStop: ApiStop?
    var closestDistance: CLLocationDistance?

    for stop in stops {
        let stopLocation = CLLocation(latitude: stop.avgLatitude, longitude: stop.avgLongitude)

        let distance = location.distance(from: stopLocation)

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
