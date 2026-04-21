// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

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
                    TransportStopAnnotationView(
                        modes: annotation.transportModes,
                        routes: annotation.stop.platforms.flatMap(\.routes)
                    )
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

#Preview {
    VStack(spacing: 24) {
        DetailedStopAnnotationView(annotation: MapAnnotationPreviewData.metroAnnotation)
        DetailedStopAnnotationView(annotation: MapAnnotationPreviewData.transferAnnotation)
        DetailedStopAnnotationView(annotation: MapAnnotationPreviewData.tramBusAnnotation)
        DetailedStopAnnotationView(annotation: MapAnnotationPreviewData.trainAnnotation)
    }
    .padding()
}
