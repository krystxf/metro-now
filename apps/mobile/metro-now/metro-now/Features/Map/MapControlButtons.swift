// metro-now
// https://github.com/krystxf/metro-now

@_spi(Experimental) import MapboxMaps
import SwiftUI

struct MapControlButtons: View {
    @Binding var isSatelliteMode: Bool
    @Binding var viewport: Viewport
    var bearing: CGFloat
    var onResetNorth: () -> Void

    var body: some View {
        VStack {
            GlassEffectContainer(spacing: 1) {
                VStack(spacing: 4) {
                    Button {
                        isSatelliteMode.toggle()
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    } label: {
                        Label("Map Style", systemImage: isSatelliteMode ? "square.2.layers.3d" : "globe.americas")
                            .labelStyle(.iconOnly)
                    }
                    .frame(width: 48, height: 48)
                    .contentShape(.rect)
                    .font(.system(size: 18))
                    .glassEffect(.regular.interactive())

                    Button {
                        withViewportAnimation(.fly(duration: 1)) {
                            viewport = .followPuck(zoom: 15)
                        }
                    } label: {
                        Label("Navigation", systemImage: "location.fill")
                            .labelStyle(.iconOnly)
                    }
                    .frame(width: 48, height: 48)
                    .contentShape(.rect)
                    .font(.system(size: 18))
                    .glassEffect(.regular.interactive())

                    Button {
                        onResetNorth()
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    } label: {
                        Label("Reset North", systemImage: "location.north.line.fill")
                            .labelStyle(.iconOnly)
                            .rotationEffect(.degrees(-bearing))
                    }
                    .frame(width: 48, height: 48)
                    .contentShape(.rect)
                    .font(.system(size: 18))
                    .glassEffect(.regular.interactive())
                }
            }
        }
        .contentShape(.rect)
    }
}
