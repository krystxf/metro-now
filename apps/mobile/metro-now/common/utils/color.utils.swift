// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

extension Color {
    init(hex: Int) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0
        )
    }
}

public extension Color {
    enum pragueMetro {
        public static let a = Color.green
        public static let b = Color(hex: 0xFFA305)
        public static let c = Color.red
    }
}
