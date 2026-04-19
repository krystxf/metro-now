// metro-now
// https://github.com/krystxf/metro-now

@_spi(Experimental) import MapboxMaps
import SwiftUI

struct RouteStopAnnotationView: View {
    let routes: [ApiRoute]

    var body: some View {
        HStack(spacing: 4) {
            ForEach(routes, id: \.id) { route in
                RouteNameIconView(
                    label: route.name,
                    background: getRouteColor(route)
                )
            }
        }
        .fixedSize(horizontal: true, vertical: false)
    }
}

struct TransportStopAnnotationView: View {
    let modes: [RailStopTransportMode]

    var body: some View {
        Group {
            if shouldCombineBusAndTram {
                badge(
                    iconName: "bus.fill",
                    background: AnyShapeStyle(
                        LinearGradient(
                            colors: [.blue, .purple],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                )
            } else {
                HStack(spacing: 4) {
                    ForEach(modes, id: \.rawValue) { mode in
                        badge(
                            iconName: iconName(for: mode),
                            background: AnyShapeStyle(backgroundColor(for: mode))
                        )
                    }
                }
            }
        }
        .fixedSize(horizontal: true, vertical: false)
    }

    private var shouldCombineBusAndTram: Bool {
        Set(modes) == Set([.bus, .tram])
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

    private func backgroundColor(for mode: RailStopTransportMode) -> Color {
        switch mode {
        case .train:
            RouteType.train.color
        case .leoExpress:
            RouteType.leoExpress.color
        case .funicular:
            RouteType.funicular.color
        case .ferry:
            RouteType.ferry.color
        case .tram:
            RouteType.tram.color
        case .bus:
            RouteType.bus.color
        }
    }

    private func badge(
        iconName: String,
        background: AnyShapeStyle
    ) -> some View {
        Image(systemName: iconName)
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: 28, height: 28)
            .background(Circle().fill(background))
            .shadow(color: .black.opacity(0.14), radius: 2, y: 1)
    }
}

struct DetailedStopAnnotationView: View {
    let annotation: RailStopMapAnnotation

    private var shouldShowLabel: Bool {
        annotation.isMetro
            || annotation.transportModes.contains(.train)
            || annotation.transportModes.contains(.leoExpress)
    }

    var body: some View {
        VStack(spacing: 3) {
            Group {
                if annotation.isMetro {
                    RouteStopAnnotationView(routes: annotation.metroRoutes)
                } else {
                    TransportStopAnnotationView(modes: annotation.transportModes)
                }
            }

            if shouldShowLabel {
                Text(annotation.stopName)
                    .font(.system(size: 10, weight: .medium))
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background(.thinMaterial, in: Capsule())
            }
        }
        .fixedSize(horizontal: true, vertical: false)
    }
}

enum MapStyleOption {
    case system(ColorScheme)
    case satellite

    var mapboxStyle: MapStyle {
        switch self {
        case .system(.dark):
            .dark
        case .system:
            .light
        case .satellite:
            .satelliteStreets
        }
    }

    var stopLabelTextColor: UIColor {
        switch self {
        case .system(.dark), .satellite:
            .white
        case .system:
            .label
        }
    }

    var stopLabelHaloColor: UIColor {
        switch self {
        case .system(.dark):
            UIColor.black.withAlphaComponent(0.65)
        case .system:
            UIColor.systemBackground.withAlphaComponent(0.92)
        case .satellite:
            UIColor.black.withAlphaComponent(0.82)
        }
    }

    var pidZoneBorderColor: Color {
        switch self {
        case .system(.dark):
            Color.white.opacity(0.35)
        case .system:
            Color.black.opacity(0.16)
        case .satellite:
            Color.white.opacity(0.55)
        }
    }
}
