// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

extension ContentView {
    var tabletLayout: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                mapPageView

                tabletSidebar(containerWidth: geometry.size.width)
            }
            .environment(\.sidebarRoutePreviewPresenter) { item in
                withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                    sidebarStopDetailItem = nil
                    sidebarRoutePreviewItem = item
                }
            }
            .environment(\.sidebarStopDetailPresenter) { stop in
                withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                    sidebarRoutePreviewItem = nil
                    sidebarStopDetailItem = stop
                }
            }
        }
        .tint(.primary)
    }

    func tabletSidebar(containerWidth: CGFloat) -> some View {
        ZStack {
            sidebarTabContainer

            sidebarOverlays
        }
        .scrollContentBackground(.hidden)
        .background(Color.red.opacity(0.4))
        .frame(width: effectiveSidebarWidth(containerWidth: containerWidth))
        .clipShape(
            RoundedRectangle(
                cornerRadius: TabletLayoutMetrics.cornerRadius,
                style: .continuous
            )
        )
        .shadow(color: .black.opacity(0.12), radius: 24, y: 10)
        .overlay(alignment: .trailing) {
            sidebarResizeHandle(containerWidth: containerWidth)
        }
        .padding(.leading, TabletLayoutMetrics.horizontalInset)
        .padding(.top, TabletLayoutMetrics.topInset)
        .padding(.bottom, TabletLayoutMetrics.bottomInset)
        .sheet(
            isPresented: $showWelcomeScreen,
            onDismiss: dismissWelcomeScreen
        ) {
            WelcomePageView()
                .presentationDetents([.medium])
        }
    }

    @ViewBuilder
    var sidebarTabContainer: some View {
        #if targetEnvironment(macCatalyst)
            catalystSidebarTabContainer
        #else
            TabView(selection: $displayedTabletSidebarTab) {
                Tab(value: AppTab.departures) {
                    departuresPageView
                } label: {
                    tabLabel(
                        "Departures",
                        systemImage: "clock",
                        isSelected: displayedTabletSidebarTab == .departures
                    )
                }

                Tab(value: AppTab.favorites) {
                    favoritesPageView
                } label: {
                    tabLabel(
                        "Favorites",
                        systemImage: "star",
                        isSelected: displayedTabletSidebarTab == .favorites
                    )
                }

                Tab(value: AppTab.search, role: .search) {
                    searchPageView()
                } label: {
                    tabLabel(
                        "Search",
                        systemImage: "magnifyingglass",
                        isSelected: false
                    )
                }
            }
            .environment(\.horizontalSizeClass, .compact)
        #endif
    }

    #if targetEnvironment(macCatalyst)
        var catalystSidebarTabContainer: some View {
            VStack(spacing: 0) {
                Group {
                    switch displayedTabletSidebarTab {
                    case .favorites:
                        favoritesPageView
                    case .search:
                        searchPageView()
                    case .departures, .map:
                        departuresPageView
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)

                CatalystSidebarTabBar(selection: $displayedTabletSidebarTab)
            }
            .environment(\.horizontalSizeClass, .compact)
        }
    #endif

    @ViewBuilder
    func sidebarResizeHandle(containerWidth: CGFloat) -> some View {
        #if targetEnvironment(macCatalyst)
            Color.clear
                .contentShape(Rectangle())
                .frame(width: 10)
                .offset(x: 5)
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .updating($sidebarDragOffset) { value, state, _ in
                            state = value.translation.width
                        }
                        .onEnded { value in
                            let base = sidebarBaseWidth(containerWidth: containerWidth)
                            let proposed = base + value.translation.width
                            userSidebarWidth = min(
                                max(proposed, TabletLayoutMetrics.minSidebarWidth),
                                TabletLayoutMetrics.maxSidebarWidth
                            )
                        }
                )
                .hoverEffect(.highlight)
        #else
            EmptyView()
        #endif
    }

    func sidebarBaseWidth(containerWidth: CGFloat) -> CGFloat {
        userSidebarWidth ?? TabletLayoutMetrics.sidebarWidth(for: containerWidth)
    }

    func effectiveSidebarWidth(containerWidth: CGFloat) -> CGFloat {
        let base = sidebarBaseWidth(containerWidth: containerWidth)
        let proposed = base + sidebarDragOffset
        return min(
            max(proposed, TabletLayoutMetrics.minSidebarWidth),
            TabletLayoutMetrics.maxSidebarWidth
        )
    }
}
