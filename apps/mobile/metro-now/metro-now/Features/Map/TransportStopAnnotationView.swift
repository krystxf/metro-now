// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct TransportStopAnnotationView: View {
    let modes: [RailStopTransportMode]
    var routes: [ApiRoute] = []

    var body: some View {
        GlassEffectContainer(spacing: 4) {
            HStack(spacing: 4) {
                ForEach(modes, id: \.rawValue) { mode in
                    badge(
                        iconName: iconName(for: mode),
                        tint: backgroundColor(for: mode)
                    )
                }
            }
        }
        .fixedSize(horizontal: true, vertical: false)
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
        guard
            let route = routes.first(where: { route in
                mapTransportMode(for: route) == mode
            })
        else {
            return RouteType.fallback.color
        }

        return getRouteColor(route)
    }

    private func badge(iconName: String, tint: Color) -> some View {
        Image(systemName: iconName)
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: 28, height: 28)
            .glassEffect(.regular.tint(tint), in: Circle())
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
