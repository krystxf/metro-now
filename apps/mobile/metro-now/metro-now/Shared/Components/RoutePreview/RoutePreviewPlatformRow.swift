// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct RoutePreviewPlatformRow: View {
    let item: RoutePreviewPlatformItem
    let isFirst: Bool
    let isLast: Bool
    let routeColor: Color
    let connectingRoutes: [ApiRoute]

    private var isPassed: Bool {
        item.state == .passed
    }

    private var lineColor: Color {
        routeColor.opacity(isPassed ? 0.3 : 1)
    }

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            timelineIndicator
                .frame(width: 20)

            Text(item.platform.name)
                .font(.body)
                .fontWeight(item.state == .current ? .semibold : .regular)
                .foregroundStyle(isPassed ? .tertiary : .primary)

            if !connectingRoutes.isEmpty {
                HStack(spacing: 4) {
                    ForEach(connectingRoutes, id: \.id) { route in
                        RouteNameIconView(
                            label: route.name,
                            background: getRouteColor(route),
                            compact: true
                        )
                        .opacity(isPassed ? 0.4 : 1)
                    }
                }
            }

            Spacer()
        }
        .frame(maxWidth: .infinity)
        .frame(height: 40)
    }

    private var timelineIndicator: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(isFirst ? .clear : lineColor)
                .frame(width: 3)
            Circle()
                .fill(lineColor)
                .frame(width: 10, height: 10)
            Rectangle()
                .fill(isLast ? .clear : lineColor)
                .frame(width: 3)
        }
    }
}

#Preview {
    let metroPlatform = RoutePreviewPreviewData.samplePlatform
    VStack(spacing: 0) {
        RoutePreviewPlatformRow(
            item: RoutePreviewPlatformItem(platform: metroPlatform, state: .passed),
            isFirst: true,
            isLast: false,
            routeColor: .green,
            connectingRoutes: []
        )
        RoutePreviewPlatformRow(
            item: RoutePreviewPlatformItem(platform: metroPlatform, state: .current),
            isFirst: false,
            isLast: false,
            routeColor: .green,
            connectingRoutes: [ApiRoute(id: "993", name: "B")]
        )
        RoutePreviewPlatformRow(
            item: RoutePreviewPlatformItem(platform: metroPlatform, state: .upcoming),
            isFirst: false,
            isLast: true,
            routeColor: .green,
            connectingRoutes: []
        )
    }
    .padding()
}
