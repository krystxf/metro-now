// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct RouteStopAnnotationView: View {
    let routes: [ApiRoute]

    private var brandedBarcelonaMetroRoutes: [ApiRoute] {
        barcelonaMetroAnnotationRoutes(routes)
    }

    var body: some View {
        GlassEffectContainer(spacing: 4) {
            HStack(spacing: 4) {
                if !brandedBarcelonaMetroRoutes.isEmpty {
                    Image("BarcelonaSubway")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 28, height: 28)
                        .shadow(color: .black.opacity(0.12), radius: 2, y: 1)

                    ForEach(brandedBarcelonaMetroRoutes, id: \.id) { route in
                        badge(for: route)
                    }
                } else {
                    ForEach(routes, id: \.id) { route in
                        badge(for: route)
                    }
                }
            }
        }
        .fixedSize(horizontal: true, vertical: false)
    }

    private func badge(for route: ApiRoute) -> some View {
        Text(route.name.uppercased())
            .font(.system(size: 12, weight: .bold))
            .fontDesign(.rounded)
            .foregroundStyle(.white)
            .padding(.horizontal, 6)
            .frame(minWidth: 26, minHeight: 26)
            .glassEffect(
                .regular.tint(getRouteColor(route)),
                in: .rect(cornerRadius: 8)
            )
    }
}

#Preview {
    VStack(spacing: 16) {
        RouteStopAnnotationView(routes: [ApiRoute(id: "991", name: "A")])
        RouteStopAnnotationView(routes: [
            ApiRoute(id: "991", name: "A"),
            ApiRoute(id: "992", name: "B"),
            ApiRoute(id: "993", name: "C"),
        ])
    }
    .padding()
}
