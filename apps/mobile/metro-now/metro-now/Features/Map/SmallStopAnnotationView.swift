// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SmallStopAnnotationView: View {
    let annotation: RailStopMapAnnotation

    private var allRoutes: [ApiRoute] {
        annotation.stop.platforms.flatMap(\.routes)
    }

    private var usesBarcelonaMetroIcon: Bool {
        allRoutes.contains(where: isBarcelonaMetroAnnotationRoute)
    }

    private var barcelonaMetroRoutes: [ApiRoute] {
        barcelonaMetroAnnotationRoutes(allRoutes)
    }

    private var barcelonaTramRoutes: [ApiRoute] {
        barcelonaTramAnnotationRoutes(allRoutes)
    }

    var body: some View {
        GlassEffectContainer(spacing: 3) {
            HStack(spacing: 3) {
                if annotation.isMetro {
                    if usesBarcelonaMetroIcon {
                        brandedRouteBadge(
                            imageName: "BarcelonaSubway",
                            routes: barcelonaMetroRoutes
                        )
                    } else {
                        ForEach(annotation.metroRoutes, id: \.id) { route in
                            dot(tint: getRouteColor(route))
                        }
                    }
                } else if !barcelonaTramRoutes.isEmpty {
                    brandedRouteBadge(
                        imageName: "BarcelonaTram",
                        routes: barcelonaTramRoutes
                    )
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

    private func brandedRouteBadge(
        imageName: String,
        routes: [ApiRoute]
    ) -> some View {
        HStack(spacing: 3) {
            Image(imageName)
                .resizable()
                .scaledToFit()
                .frame(width: 18, height: 18)
                .shadow(color: .black.opacity(0.12), radius: 1.5, y: 1)

            ForEach(routes, id: \.id) { route in
                RouteNameIconView(
                    label: route.name,
                    background: getRouteColor(route),
                    compact: true
                )
            }
        }
    }

    private func routeColor(for mode: RailStopTransportMode) -> Color {
        guard let route = allRoutes.first(where: { mapTransportMode(for: $0) == mode }) else {
            return RouteType.fallback.color
        }
        return getRouteColor(route)
    }
}
