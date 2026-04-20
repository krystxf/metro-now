// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI
#if canImport(UIKit) && !os(watchOS)
    import UIKit

    extension Color {
        /// SwiftUI system colors (.blue, .green, .indigo, ...) resolve to dynamic
        /// UIColors. Mapbox reads .cgColor on the render thread without a
        /// UITraitCollection, so dynamic colors fall back to unresolved/dark
        /// variants. Resolve against a fixed trait collection so route/brand
        /// colors render consistently on the map regardless of dark mode.
        func resolvedUIColor(
            style: UIUserInterfaceStyle = .light
        ) -> UIColor {
            UIColor(self).resolvedColor(
                with: UITraitCollection(userInterfaceStyle: style)
            )
        }
    }
#endif

extension Color {
    init(hex: Int) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0
        )
    }

    init?(hexString: String) {
        let normalized = hexString
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "#", with: "")

        guard
            normalized.count == 6,
            let hex = Int(normalized, radix: 16)
        else {
            return nil
        }

        self.init(hex: hex)
    }
}

public extension Color {
    enum pragueMetro {
        public static let a = Color.green
        public static let b = Color(hex: 0xFFCA38)
        public static let c = Color.red
    }
}

func getRouteColor(
    _ routeName: String?,
    apiColor: String?
) -> Color {
    if let apiColor, let parsedColor = Color(hexString: apiColor) {
        return parsedColor
    }

    return getRouteColor(routeName)
}

func getRouteColor(_ route: ApiRoute) -> Color {
    getRouteColor(route.name, apiColor: route.color)
}

func getRouteColor(_ route: ApiRouteDetail) -> Color {
    getRouteColor(route.shortName, apiColor: route.color)
}

func getRouteColor(
    routeName: String,
    routeId: String?,
    routeColor: String? = nil,
    availableRoutes: [ApiRoute]
) -> Color {
    if let routeColor, let parsedColor = Color(hexString: routeColor) {
        return parsedColor
    }

    if let routeId,
       let matchedRoute = availableRoutes.first(where: { route in
           route.id == routeId || route.backendRouteId == routeId
       })
    {
        return getRouteColor(matchedRoute)
    }

    if let matchedRoute = availableRoutes.first(where: { $0.name == routeName }) {
        return getRouteColor(matchedRoute)
    }

    return getRouteColor(routeName)
}
