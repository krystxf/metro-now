// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

extension ContentView {
    @ViewBuilder
    var sidebarOverlays: some View {
        if showInfotexts {
            sidebarOverlayContainer {
                InfotextsPageView(onClose: {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                        showInfotexts = false
                    }
                })
            }
            .transition(.move(edge: .bottom).combined(with: .opacity))
            .zIndex(2)
        }

        if let stop = sidebarStopDetailItem {
            sidebarOverlayContainer {
                MapStopDetailSheet(
                    stop: stop,
                    allStops: stopsViewModel.stops,
                    favoritesViewModel: favoritesViewModel,
                    onClose: {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                            sidebarStopDetailItem = nil
                        }
                    }
                )
                .environmentObject(locationModel)
            }
            // Re-create the view (and its @StateObject view model) when the
            // selected stop changes, otherwise SwiftUI reuses the view model
            // bound to the previously selected stop's platform IDs.
            .id(stop.id)
            .transition(.move(edge: .bottom).combined(with: .opacity))
            .zIndex(3)
        }

        if let item = sidebarRoutePreviewItem {
            sidebarOverlayContainer {
                RoutePreviewView(
                    routeId: item.id,
                    headsign: item.headsign,
                    currentPlatformId: item.currentPlatformId,
                    currentPlatformName: item.currentPlatformName,
                    onClose: {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                            sidebarRoutePreviewItem = nil
                        }
                    }
                )
                .environmentObject(locationModel)
            }
            .transition(.move(edge: .bottom).combined(with: .opacity))
            .zIndex(4)
        }
    }

    func sidebarOverlayContainer(
        @ViewBuilder content: () -> some View
    ) -> some View {
        content()
            .environment(\.horizontalSizeClass, .compact)
            .background(Color.clear)
    }
}
