// metro-now
// https://github.com/krystxf/metro-now

@_spi(Experimental) import MapboxMaps
import SwiftUI

struct MapControlButtons: View {
    @Binding var isSatelliteMode: Bool
    @Binding var viewport: Viewport
    var bearing: CGFloat
    var onResetNorth: () -> Void

    private var isPointingNorth: Bool {
        abs(bearing.remainder(dividingBy: 360)) < 0.5
    }

    private struct CompassNeedle: View {
        var bearing: CGFloat

        var body: some View {
            ZStack {
                Triangle()
                    .fill(Color.red)
                    .frame(width: 9, height: 12)
                    .offset(y: -6)
                Triangle()
                    .fill(Color.secondary.opacity(0.6))
                    .frame(width: 9, height: 12)
                    .rotationEffect(.degrees(180))
                    .offset(y: 6)
            }
            .rotationEffect(.degrees(-bearing))
        }
    }

    private struct Triangle: Shape {
        func path(in rect: CGRect) -> Path {
            var path = Path()
            path.move(to: CGPoint(x: rect.midX, y: rect.minY))
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
            path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
            path.closeSubpath()
            return path
        }
    }

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
                            .font(.system(size: 18))
                            .frame(width: 48, height: 48)
                            .contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                    .glassEffect(.regular.interactive())

                    Button {
                        withViewportAnimation(.fly(duration: 1)) {
                            viewport = .followPuck(zoom: 15)
                        }
                    } label: {
                        Label("Navigation", systemImage: "location.fill")
                            .labelStyle(.iconOnly)
                            .font(.system(size: 18))
                            .frame(width: 48, height: 48)
                            .contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                    .glassEffect(.regular.interactive())

                    if !isPointingNorth {
                        Button {
                            onResetNorth()
                            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        } label: {
                            CompassNeedle(bearing: bearing)
                                .accessibilityLabel("Reset North")
                                .frame(width: 48, height: 48)
                                .contentShape(.rect)
                        }
                        .buttonStyle(.plain)
                        .glassEffect(.regular.interactive())
                        .transition(.scale.combined(with: .opacity))
                    }
                }
                .animation(.easeInOut(duration: 0.2), value: isPointingNorth)
            }
        }
        .contentShape(.rect)
    }
}
