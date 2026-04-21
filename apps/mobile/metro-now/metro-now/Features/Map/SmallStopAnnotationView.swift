// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SmallStopAnnotationView: View {
    let annotation: RailStopMapAnnotation

    private var allRoutes: [ApiRoute] {
        annotation.stop.platforms.flatMap(\.routes)
    }

    var body: some View {
        GlassEffectContainer(spacing: 3) {
            HStack(spacing: 3) {
                if annotation.isMetro {
                    ForEach(annotation.metroRoutes, id: \.id) { route in
                        dot(tint: getRouteColor(route))
                    }
                } else {
                    ForEach(annotation.transportModes, id: \.rawValue) { mode in
                        dot(tint: routeColor(for: mode))
                    }
                }
            }
        }
        .fixedSize(horizontal: true, vertical: false)
    }

    private func dot(tint: Color) -> some View {
        Color.clear
            .frame(width: 14, height: 14)
            .glassEffect(.regular.tint(tint), in: Circle())
    }

    private func routeColor(for mode: RailStopTransportMode) -> Color {
        guard let route = allRoutes.first(where: { mapTransportMode(for: $0) == mode }) else {
            return RouteType.fallback.color
        }
        return getRouteColor(route)
    }
}
