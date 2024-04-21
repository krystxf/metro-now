//
//  location.utils.swift
//  MetroMate
//
//  Created by Kryštof Krátký on 01.04.2024.
//

import Foundation

let EARTH_RADIUS_KM = 6371.0

// Calculate distance with maximum accuracy just for fun
func getDistanceBetweenCoordinates(lat1: Double, lon1: Double, lat2: Double, lon2: Double) -> Double {
    // Convert latitude and longitude from degrees to radians
    let lat1Rad = lat1 * .pi / 180.0
    let lon1Rad = lon1 * .pi / 180.0
    let lat2Rad = lat2 * .pi / 180.0
    let lon2Rad = lon2 * .pi / 180.0

    // Calculate differences in latitude and longitude
    let deltaLat = lat2Rad - lat1Rad
    let deltaLon = lon2Rad - lon1Rad

    // Haversine formula
    let a = sin(deltaLat / 2) * sin(deltaLat / 2) +
        cos(lat1Rad) * cos(lat2Rad) *
        sin(deltaLon / 2) * sin(deltaLon / 2)
    let c = 2 * atan2(sqrt(a), sqrt(1 - a))
    let distance = EARTH_RADIUS_KM * c

    return distance
}

func getDistanceToStation(lat:Double, lon:Double,station:Station)->Double{
    let distanceToStation = getDistanceBetweenCoordinates(lat1: lat, lon1: lon, lat2: station.avgLat, lon2: station.avgLon)
    
    return distanceToStation
}

func getClosestStation(lat: Double, lon: Double) -> Station {
    let stations = Station.allStations

    var closestStationIndex: Int = 0
    var distanceToClosestStation = Double.infinity

    for (index, station) in stations.enumerated() {
        let distanceToStation = getDistanceToStation(lat:lat, lon:lon, station:station)
        
        if distanceToStation < distanceToClosestStation {
            distanceToClosestStation = distanceToStation
            closestStationIndex = index
        }
    }
    
    return stations[closestStationIndex]
}

// stations array sorted from the closest to the farthest
func getStationsSortedByDistance(lat: Double, lon: Double) -> [Station] {
    let stations = Station.allStations

    let sortedStations = stations.sorted{station1,station2 in 
        let distanceToStation1 = getDistanceToStation(lat: lat, lon: lon, station: station1)
        let distanceToStation2 = getDistanceToStation(lat: lat, lon: lon, station: station2)
        
        return distanceToStation1 < distanceToStation2
    }

    return [];
}
