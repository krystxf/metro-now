// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

func getMetroLineColor(_ line: MetroLine?) -> Color? {
    switch line {
    case .A: .green
    case .B: .yellow
    case .C: .red
    default: nil
    }
}
