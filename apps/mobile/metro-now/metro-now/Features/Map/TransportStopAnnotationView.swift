// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

func isBarcelonaMetroAnnotationRoute(_ route: ApiRoute) -> Bool {
    guard
        route.feed?.uppercased() == "BARCELONA",
        route.vehicleType?.uppercased() == "SUBWAY"
    else {
        return false
    }

    let normalizedName = route.name
        .trimmingCharacters(in: .whitespacesAndNewlines)
        .uppercased()

    guard normalizedName.hasPrefix("L"), normalizedName.count > 1 else {
        return false
    }

    return normalizedName.dropFirst().allSatisfy(\.isNumber)
}

func isBarcelonaTramAnnotationRoute(_ route: ApiRoute) -> Bool {
    isBarcelonaMapTramRoute(route)
}

func barcelonaMetroAnnotationRoutes(_ routes: [ApiRoute]) -> [ApiRoute] {
    uniqueAnnotationRoutes(routes, matching: isBarcelonaMetroAnnotationRoute)
}

func barcelonaTramAnnotationRoutes(_ routes: [ApiRoute]) -> [ApiRoute] {
    uniqueAnnotationRoutes(routes, matching: isBarcelonaTramAnnotationRoute)
}

private func uniqueAnnotationRoutes(
    _ routes: [ApiRoute],
    matching predicate: (ApiRoute) -> Bool
) -> [ApiRoute] {
    var seenRouteIds = Set<String>()

    return routes
        .filter(predicate)
        .sorted { left, right in
            left.name.localizedCompare(right.name) == .orderedAscending
        }
        .filter { route in
            seenRouteIds.insert(route.id).inserted
        }
}

struct TransportStopAnnotationView: View {
    let modes: [RailStopTransportMode]
    var routes: [ApiRoute] = []

    var body: some View {
        GlassEffectContainer(spacing: 4) {
            HStack(spacing: 4) {
                ForEach(modes, id: \.rawValue) { mode in
                    let route = representativeRoute(for: mode)
                    badge(for: mode, route: route)
                }
            }
        }
        .fixedSize(horizontal: true, vertical: false)
    }

    private func representativeRoute(for mode: RailStopTransportMode) -> ApiRoute? {
        routes.first { route in
            mapTransportMode(for: route) == mode
        }
    }

    private var brandedBarcelonaMetroRoutes: [ApiRoute] {
        barcelonaMetroAnnotationRoutes(routes)
    }

    private var brandedBarcelonaTramRoutes: [ApiRoute] {
        barcelonaTramAnnotationRoutes(routes)
    }

    private func iconName(for mode: RailStopTransportMode) -> String {
        switch mode {
        case .train, .leoExpress:
            "train.side.front.car"
        case .funicular:
            "cablecar.fill"
        case .ferry:
            "ferry.fill"
        case .tram:
            "tram.fill"
        case .bus:
            "bus.fill"
        }
    }

    @ViewBuilder
    private func badge(for mode: RailStopTransportMode, route: ApiRoute?) -> some View {
        if let route, isBarcelonaMetroAnnotationRoute(route) {
            brandedRouteBadge(
                imageName: "BarcelonaSubway",
                routes: brandedBarcelonaMetroRoutes
            )
        } else if let route, isBarcelonaTramAnnotationRoute(route) {
            brandedRouteBadge(
                imageName: "BarcelonaTram",
                routes: brandedBarcelonaTramRoutes
            )
        } else {
            Image(systemName: iconName(for: mode))
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .glassEffect(.regular.tint(backgroundColor(for: route)), in: Circle())
        }
    }

    private func backgroundColor(for route: ApiRoute?) -> Color {
        guard let route else {
            return RouteType.fallback.color
        }

        return getRouteColor(route)
    }

    private func brandedRouteBadge(
        imageName: String,
        routes: [ApiRoute]
    ) -> some View {
        HStack(spacing: 4) {
            Image(imageName)
                .resizable()
                .scaledToFit()
                .frame(width: 28, height: 28)
                .shadow(color: .black.opacity(0.12), radius: 2, y: 1)

            ForEach(routes, id: \.id) { route in
                RouteNameIconView(
                    label: route.name,
                    background: getRouteColor(route)
                )
            }
        }
    }
}

#Preview {
    VStack(spacing: 16) {
        TransportStopAnnotationView(modes: [.tram])
        TransportStopAnnotationView(modes: [.bus])
        TransportStopAnnotationView(modes: [.tram, .bus])
        TransportStopAnnotationView(modes: [.train, .leoExpress])
        TransportStopAnnotationView(modes: [.ferry, .funicular])
    }
    .padding()
}
