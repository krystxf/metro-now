// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

enum MetroLine: String {
    case A
    case B
    case C

    var color: Color {
        switch self {
        case .A: .pragueMetro.a
        case .B: .pragueMetro.b
        case .C: .pragueMetro.c
        }
    }
}

let METRO_LINES = [
    MetroLine.A.rawValue,
    MetroLine.B.rawValue,
    MetroLine.C.rawValue,
]

enum RouteType {
    case fallback
    case metro(MetroLine)
    case night
    case bus
    case tram
    case ferry
    case funicular
    case train

    var color: Color {
        switch self {
        case .fallback: .black
        case let .metro(line): line.color
        case .night: .black
        case .bus: .blue
        case .tram: .indigo
        case .ferry: .cyan
        case .funicular: .brown
        case .train: .gray
        }
    }

    var rawValue: String {
        switch self {
        case .fallback:
            "Fallback"
        case let .metro(line):
            line.rawValue
        case .night:
            "Night"
        case .bus:
            "Bus"
        case .tram:
            "Tram"
        case .ferry:
            "Ferry"
        case .funicular:
            "Funicular"
        case .train:
            "Train"
        }
    }
}
