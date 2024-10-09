
import SwiftUI

func getBgColors(_ routes: [String]) -> [Color] {
    let vehicleTypes: [VehicleType] = routes.map { getVehicleType($0) }

    if vehicleTypes.count == 1, vehicleTypes[0] == .metro {
        return [getMetroLineColor(routes[0])]
    }

    if routes.allSatisfy({ isNightService($0) }) {
        return [.gray]
    } else if routes.allSatisfy({ $0.starts(with: "X") }) {
        return [.orange]
    }

    var res: [Color] = []
    if vehicleTypes.contains(.bus) {
        res.append(.blue)
    }

    if vehicleTypes.contains(.tram) {
        res.append(.indigo)
    } else if vehicleTypes.contains(.lightrail) {
        res.append(.gray)
    } else if vehicleTypes.contains(.cablecar) {
        res.append(.brown)
    } else if vehicleTypes.contains(.ferry) {
        res.append(.mint)
    }

    return res
}
