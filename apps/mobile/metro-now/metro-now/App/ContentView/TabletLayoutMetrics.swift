// metro-now
// https://github.com/krystxf/metro-now

import CoreGraphics

enum TabletLayoutMetrics {
    static let minSidebarWidth: CGFloat = 360
    static let maxSidebarWidth: CGFloat = 560
    static let sidebarWidthRatio: CGFloat = 0.34
    static let horizontalInset: CGFloat = 12
    static let topInset: CGFloat = 6
    static let bottomInset: CGFloat = 6
    static let contentInset: CGFloat = 16
    static let cornerRadius: CGFloat = 32

    static func sidebarWidth(for containerWidth: CGFloat) -> CGFloat {
        let target = containerWidth * sidebarWidthRatio
        return min(max(target, minSidebarWidth), maxSidebarWidth)
    }
}
