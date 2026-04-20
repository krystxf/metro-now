// metro-now
// https://github.com/krystxf/metro-now

@_spi(Experimental) import MapboxMaps
import SwiftUI

/// Zoom in / zoom out buttons for the map. Shown only when the iPad app
/// runs on Mac ("Designed for iPad" on Apple Silicon) — iPad users have
/// pinch-to-zoom, so these buttons would be redundant there.
struct MapZoomButtons: View {
    @Binding var viewport: Viewport
    var cameraState: CameraState?

    private let minZoom: CGFloat = 0
    private let maxZoom: CGFloat = 22
    private let zoomStep: CGFloat = 1

    private var currentZoom: CGFloat {
        cameraState.map { CGFloat($0.zoom) } ?? 11
    }

    private func applyZoom(_ newZoom: CGFloat) {
        guard let cameraState else {
            return
        }

        let clamped = min(max(newZoom, minZoom), maxZoom)

        withViewportAnimation(.easeOut(duration: 0.2)) {
            viewport = .camera(
                center: cameraState.center,
                zoom: clamped,
                bearing: CGFloat(cameraState.bearing),
                pitch: CGFloat(cameraState.pitch)
            )
        }
    }

    var body: some View {
        GlassEffectContainer(spacing: 1) {
            VStack(spacing: 4) {
                Button {
                    applyZoom(currentZoom + zoomStep)
                } label: {
                    Label("Zoom In", systemImage: "plus")
                        .labelStyle(.iconOnly)
                        .font(.system(size: 18, weight: .semibold))
                        .frame(width: 48, height: 48)
                        .contentShape(.rect)
                }
                .buttonStyle(.plain)
                .glassEffect(.regular.interactive())
                .disabled(cameraState == nil || currentZoom >= maxZoom)

                Button {
                    applyZoom(currentZoom - zoomStep)
                } label: {
                    Label("Zoom Out", systemImage: "minus")
                        .labelStyle(.iconOnly)
                        .font(.system(size: 18, weight: .semibold))
                        .frame(width: 48, height: 48)
                        .contentShape(.rect)
                }
                .buttonStyle(.plain)
                .glassEffect(.regular.interactive())
                .disabled(cameraState == nil || currentZoom <= minZoom)
            }
        }
        .contentShape(.rect)
    }
}
