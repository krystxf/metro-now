// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct RouteStopAnnotationView: View {
    let routes: [ApiRoute]

    var body: some View {
        GlassEffectContainer(spacing: 4) {
            HStack(spacing: 4) {
                ForEach(routes, id: \.id) { route in
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
        }
        .fixedSize(horizontal: true, vertical: false)
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
