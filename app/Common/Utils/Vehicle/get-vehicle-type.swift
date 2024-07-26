
// https://pid.cz/jizdni-rady-podle-linek/metro/
func getVehicleType(_ nameAnyCased: String) -> VehicleType {
    let name = nameAnyCased.uppercased()

    if name.hasPrefix("LD") {
        return .cablecar
    }

    if name.hasPrefix("R") ||
        name.hasPrefix("S") ||
        name.hasPrefix("T") ||
        name.hasPrefix("U")
    {
        return .lightrail
    }

    if name.hasPrefix("P") {
        return .ferry
    }

    let number = Int(name)
    guard let number else {
        return .bus
    }

    // trolley bus
    if number == 58 || number == 59 {
        return .bus
    } else if number < 100 {
        return .tram
    }

    return .bus
}
