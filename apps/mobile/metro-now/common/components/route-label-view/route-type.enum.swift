// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

enum MetroLine: String {
    case A
    case B
    case C

    var color: Color {
        switch self {
        case .A: .green
        case .B: .yellow
        case .C: .red
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
}
