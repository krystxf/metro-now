// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI
import UIKit

struct ContentView: View {
    private enum TabletLayout {
        static let minSidebarWidth: CGFloat = 360
        static let maxSidebarWidth: CGFloat = 560
        static let sidebarWidthRatio: CGFloat = 0.34
        static let horizontalInset: CGFloat = 12
        static let topInset: CGFloat = 6
        static let bottomInset: CGFloat = 6
        static let contentInset: CGFloat = 8
        static let cornerRadius: CGFloat = 32

        static func sidebarWidth(for containerWidth: CGFloat) -> CGFloat {
            let target = containerWidth * sidebarWidthRatio
            return min(max(target, minSidebarWidth), maxSidebarWidth)
        }
    }

    @EnvironmentObject private var appDelegate: AppDelegate
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @StateObject private var appNavigation = AppNavigationViewModel()
    @StateObject private var networkMonitor = NetworkMonitor()
    @StateObject private var locationModel = LocationViewModel()
    @State private var showNoInternetBanner = false

    @AppStorage(
        AppStorageKeys.hasSeenWelcomeScreen.rawValue
    ) var hasSeenWelcomeScreen = false
    @StateObject var stopsViewModel = StopsViewModel()
    @StateObject var favoritesViewModel = FavoritesViewModel()
    @State private var showWelcomeScreen: Bool = false
    @State private var showInfotexts: Bool = false
    @State private var infotextsPresentationDetent: PresentationDetent = .large
    @State private var showSettingsSheet = false
    @State private var showSearchSheet = false
    @State private var showDummyQuickSearch = false
    @State private var sidebarRoutePreviewItem: SheetIdItem?
    @State private var sidebarStopDetailItem: ApiStop?
    @State private var displayedPhoneTab: AppTab = .departures
    @State private var displayedTabletSidebarTab: AppTab = .departures
    @State private var userSidebarWidth: CGFloat?
    @GestureState private var sidebarDragOffset: CGFloat = 0

    private var isTabletLayout: Bool {
        let idiom = UIDevice.current.userInterfaceIdiom
        return (idiom == .pad || idiom == .mac) && horizontalSizeClass == .regular
    }

    private var supportsQuickSearchShortcut: Bool {
        let idiom = UIDevice.current.userInterfaceIdiom
        return idiom == .pad || idiom == .mac
    }

    private var shouldPresentSearchAsSheet: Bool {
        !isTabletLayout && horizontalSizeClass == .compact
    }

    private var tabletSidebarContentInset: CGFloat {
        isTabletLayout ? TabletLayout.contentInset : 0
    }

    private func searchPageView(showsCloseButton: Bool = false) -> some View {
        SearchPageView(
            showsCloseButton: showsCloseButton
        )
        .environmentObject(locationModel)
        .environmentObject(stopsViewModel)
        .environmentObject(favoritesViewModel)
        .safeAreaPadding(.horizontal, tabletSidebarContentInset)
        .safeAreaPadding(.top, tabletSidebarContentInset)
    }

    private var settingsPageView: some View {
        NavigationStack {
            SettingsPageView(showsCloseButton: true)
        }
    }

    private var departuresPageView: some View {
        NavigationStack {
            ClosestStopPageView()
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button {
                            showSettingsSheet = true
                        } label: {
                            Label("Settings", systemImage: "gearshape")
                        }
                        .accessibilityIdentifier("button.open-settings")
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        Button(action: {
                            showInfotexts = true
                        }) {
                            Label("Info", systemImage: "info.bubble")
                        }
                    }
                }
        }
        .environmentObject(locationModel)
        .safeAreaPadding(.horizontal, tabletSidebarContentInset)
        .safeAreaPadding(.top, tabletSidebarContentInset)
    }

    private var favoritesPageView: some View {
        NavigationStack {
            FavoritesPageView()
        }
        .environmentObject(locationModel)
        .environmentObject(stopsViewModel)
        .environmentObject(favoritesViewModel)
        .safeAreaPadding(.horizontal, tabletSidebarContentInset)
        .safeAreaPadding(.top, tabletSidebarContentInset)
    }

    private var mapPageView: some View {
        MapPageView(isAlwaysVisible: isTabletLayout)
            .environmentObject(locationModel)
            .environmentObject(stopsViewModel)
            .environmentObject(favoritesViewModel)
    }

    private var phoneLayout: some View {
        TabView(selection: $displayedPhoneTab) {
            Tab("Departures", systemImage: "clock", value: .departures) {
                departuresPageView
            }

            Tab("Favorites", systemImage: "star", value: .favorites) {
                favoritesPageView
            }

            Tab("Map", systemImage: "map", value: .map) {
                mapPageView
            }

            Tab("Search", systemImage: "magnifyingglass", value: .search, role: .search) {
                if shouldPresentSearchAsSheet {
                    Color.clear
                } else {
                    searchPageView()
                }
            }
        }
        .tint(.primary)
    }

    private var tabletLayout: some View {
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

    var body: some View {
        ZStack {
            Group {
                if isTabletLayout {
                    tabletLayout
                } else {
                    applyingNonSearchSheets(to: phoneLayout)
                }
            }
            .sheet(
                isPresented: $showSearchSheet,
                onDismiss: dismissSearchSheet
            ) {
                searchPageView(showsCloseButton: true)
                    .presentationDetents([.medium, .large])
            }

            VStack {
                if showNoInternetBanner {
                    NoInternetBannerView()
                        .transition(getBannerTransition(.top))
                }
                Spacer()
            }
            .ignoresSafeArea(edges: .bottom)

            if showDummyQuickSearch {
                dummyQuickSearchOverlay
            }

            quickSearchShortcutTrigger
            quickSearchDismissTrigger
        }
        .accessibilityIdentifier("screen.root")
        .onAppear {
            showWelcomeScreen = !hasSeenWelcomeScreen
            handleQuickAction(appDelegate.quickAction)
            syncDisplayedTabs(with: appNavigation.selectedTab)
        }
        .onChange(of: appDelegate.quickAction) { _, action in
            handleQuickAction(action)
        }
        .onChange(of: horizontalSizeClass) { _, _ in
            guard !shouldPresentSearchAsSheet, showSearchSheet else {
                return
            }

            showSearchSheet = false
        }
        .onChange(of: showInfotexts) { _, isPresented in
            guard isPresented else { return }
            infotextsPresentationDetent = .large
        }
        .onChange(of: displayedPhoneTab) { oldTab, newTab in
            guard !isTabletLayout else {
                return
            }

            guard shouldPresentSearchAsSheet, newTab == .search else {
                guard appNavigation.selectedTab != newTab else {
                    return
                }

                appNavigation.selectedTab = newTab
                return
            }

            displayedPhoneTab = oldTab
            presentSearchSheet()
        }
        .onChange(of: displayedTabletSidebarTab) { _, newTab in
            guard isTabletLayout,
                  appNavigation.selectedTab != newTab
            else {
                return
            }

            appNavigation.selectedTab = newTab
        }
        .onChange(of: appNavigation.selectedTab) { _, newTab in
            syncDisplayedTabs(with: newTab)

            guard !isTabletLayout else {
                return
            }

            if shouldPresentSearchAsSheet, newTab == .search {
                presentSearchSheet()
                return
            }

            guard shouldPresentSearchAsSheet, showSearchSheet, newTab != .search else {
                return
            }

            showSearchSheet = false
        }
        .onReceive(networkMonitor.$isConnected) { isConnected in
            setShowNoInternetBanner(!isConnected)
        }
        .environmentObject(appNavigation)
    }

    private func handleQuickAction(_ action: QuickAction?) {
        guard let action else { return }
        appDelegate.quickAction = nil
        switch action {
        case .map: appNavigation.selectedTab = .map
        case .favorites: appNavigation.selectedTab = .favorites
        }
    }

    private func setShowNoInternetBanner(_ value: Bool) {
        withAnimation {
            showNoInternetBanner = value
        }
    }

    private func dismissWelcomeScreen() {
        showWelcomeScreen = false
        hasSeenWelcomeScreen = true
    }

    private func dismissSearchSheet() {
        showSearchSheet = false
    }

    private var quickSearchShortcutTrigger: some View {
        Button {
            guard supportsQuickSearchShortcut else {
                return
            }

            withAnimation(.easeOut(duration: 0.15)) {
                showDummyQuickSearch.toggle()
            }
        } label: {
            EmptyView()
        }
        .keyboardShortcut("k", modifiers: [.command])
        .opacity(0.001)
        .frame(width: 0, height: 0)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private var quickSearchDismissTrigger: some View {
        Button {
            guard supportsQuickSearchShortcut, showDummyQuickSearch else {
                return
            }

            withAnimation(.easeOut(duration: 0.15)) {
                showDummyQuickSearch = false
            }
        } label: {
            EmptyView()
        }
        .keyboardShortcut(.cancelAction)
        .opacity(0.001)
        .frame(width: 0, height: 0)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private var dummyQuickSearchOverlay: some View {
        DummyQuickSearchOverlay(
            isPresented: $showDummyQuickSearch
        )
        .environmentObject(locationModel)
        .transition(.opacity.combined(with: .scale(scale: 0.6)))
        .zIndex(10)
    }

    private func sidebarBaseWidth(containerWidth: CGFloat) -> CGFloat {
        userSidebarWidth ?? TabletLayout.sidebarWidth(for: containerWidth)
    }

    private func effectiveSidebarWidth(containerWidth: CGFloat) -> CGFloat {
        let base = sidebarBaseWidth(containerWidth: containerWidth)
        let proposed = base + sidebarDragOffset
        return min(max(proposed, TabletLayout.minSidebarWidth), TabletLayout.maxSidebarWidth)
    }

    private func tabletSidebar(containerWidth: CGFloat) -> some View {
        ZStack {
            TabView(selection: $displayedTabletSidebarTab) {
                Tab("Departures", systemImage: "clock", value: .departures) {
                    departuresPageView
                }

                Tab("Favorites", systemImage: "star", value: .favorites) {
                    favoritesPageView
                }

                Tab("Search", systemImage: "magnifyingglass", value: .search, role: .search) {
                    searchPageView()
                }
            }
            .environment(\.horizontalSizeClass, .compact)

            sidebarOverlays
        }
        .frame(width: effectiveSidebarWidth(containerWidth: containerWidth))
        .background(.regularMaterial)
        .clipShape(
            RoundedRectangle(
                cornerRadius: TabletLayout.cornerRadius,
                style: .continuous
            )
        )
        .shadow(color: .black.opacity(0.12), radius: 24, y: 10)
        .overlay(alignment: .trailing) {
            sidebarResizeHandle(containerWidth: containerWidth)
        }
        .padding(.leading, TabletLayout.horizontalInset)
        .padding(.top, TabletLayout.topInset)
        .padding(.bottom, TabletLayout.bottomInset)
        .sheet(
            isPresented: $showWelcomeScreen,
            onDismiss: dismissWelcomeScreen
        ) {
            WelcomePageView()
                .presentationDetents([.medium])
        }
    }

    @ViewBuilder
    private func sidebarResizeHandle(containerWidth: CGFloat) -> some View {
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
                                max(proposed, TabletLayout.minSidebarWidth),
                                TabletLayout.maxSidebarWidth
                            )
                        }
                )
                .hoverEffect(.highlight)
        #else
            EmptyView()
        #endif
    }

    @ViewBuilder
    private var sidebarOverlays: some View {
        if showSettingsSheet {
            sidebarOverlayContainer {
                NavigationStack {
                    SettingsPageView(
                        showsCloseButton: true,
                        onClose: {
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                                showSettingsSheet = false
                            }
                        }
                    )
                }
            }
            .transition(.move(edge: .bottom).combined(with: .opacity))
            .zIndex(1)
        }

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

    private func sidebarOverlayContainer(
        @ViewBuilder content: () -> some View
    ) -> some View {
        content()
            .environment(\.horizontalSizeClass, .compact)
            .background(Color.clear)
    }

    private func applyingNonSearchSheets(to content: some View) -> some View {
        content
            .sheet(
                isPresented: $showSettingsSheet
            ) {
                settingsPageView
                    .presentationDetents([.large])
            }
            .sheet(isPresented: $showInfotexts) {
                InfotextsPageView()
                    .presentationDetents(
                        [.medium, .large],
                        selection: $infotextsPresentationDetent
                    )
            }
            .sheet(
                isPresented: $showWelcomeScreen,
                onDismiss: dismissWelcomeScreen
            ) {
                WelcomePageView()
                    .presentationDetents([.medium])
            }
    }

    private func syncDisplayedTabs(with tab: AppTab) {
        if displayedPhoneTab != tab {
            displayedPhoneTab = tab
        }

        switch tab {
        case .departures, .favorites, .search:
            if displayedTabletSidebarTab != tab {
                displayedTabletSidebarTab = tab
            }
        case .map:
            break
        }
    }

    @MainActor
    private func presentSearchSheet() {
        guard !showSearchSheet else {
            return
        }

        Task { @MainActor in
            showSearchSheet = true
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AppDelegate())
}

private struct DummyQuickSearchOverlay: View {
    @Binding var isPresented: Bool
    @EnvironmentObject private var appNavigation: AppNavigationViewModel
    @EnvironmentObject private var locationModel: LocationViewModel
    @State private var text = ""
    @StateObject private var searchViewModel = SearchStopsViewModel()
    @FocusState private var isFieldFocused: Bool
    @State private var nearestStops: [ApiStop] = []

    private var normalizedQuery: String {
        text.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func fetchNearestStops() async {
        guard let location = locationModel.location else { return }

        do {
            let response = try await fetchGraphQLQuery(
                MetroNowAPI.ClosestStopsQuery(
                    latitude: location.coordinate.latitude,
                    longitude: location.coordinate.longitude,
                    limit: .some(4)
                )
            )
            nearestStops = response.closestStops.map { mapGraphQLClosestStop($0) }
        } catch {
            print("Error fetching nearest stops for spotlight: \(error)")
        }
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .top) {
                Color.clear
                    .ignoresSafeArea()
                    .contentShape(Rectangle())
                    .onTapGesture {
                        withAnimation(.easeOut(duration: 0.15)) {
                            isPresented = false
                        }
                    }

                VStack(spacing: 0) {
                    HStack(spacing: 12) {
                        Image(systemName: "magnifyingglass")
                            .foregroundStyle(.secondary)

                        TextField("Search Stops", text: $text)
                            .textFieldStyle(.plain)
                            .focused($isFieldFocused)

                        Text("⌘K")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal, 18)
                    .frame(height: 60)

                    Rectangle()
                        .fill(.primary.opacity(0.14))
                        .frame(height: 1)

                    spotlightResultsContent
                }
                .frame(maxWidth: 560)
                .glassEffect(
                    .regular.interactive(),
                    in: RoundedRectangle(
                        cornerRadius: 24,
                        style: .continuous
                    )
                )
                .shadow(color: .black.opacity(0.16), radius: 32, y: 14)
                .padding(.horizontal, 24)
                .padding(.top, geometry.size.height * 0.2)
            }
        }
        .onAppear {
            isFieldFocused = true
        }
        .task(id: locationModel.location?.coordinate.latitude) {
            await fetchNearestStops()
        }
        .onChange(of: text) { _, newValue in
            searchViewModel.updateSearch(query: newValue)
        }
    }

    @ViewBuilder
    private var spotlightResultsContent: some View {
        if normalizedQuery.isEmpty {
            if nearestStops.isEmpty {
                ContentUnavailableView(
                    "Search Stops",
                    systemImage: "magnifyingglass",
                    description: Text("Type a stop name to search.")
                )
                .frame(maxWidth: .infinity)
                .frame(height: 180)
            } else {
                LazyVStack(spacing: 0) {
                    ForEach(nearestStops, id: \.id) { stop in
                        Button {
                            appNavigation.openMap(for: stop)
                            withAnimation(.easeOut(duration: 0.15)) {
                                isPresented = false
                            }
                        } label: {
                            SearchPageItemView(
                                label: stop.name,
                                routes: stop.platforms.flatMap(\.routes)
                            )
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 18)
                            .padding(.vertical, 14)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)

                        if stop.id != nearestStops.last?.id {
                            Rectangle()
                                .fill(.primary.opacity(0.1))
                                .frame(height: 1)
                                .padding(.horizontal, 18)
                        }
                    }
                }
            }
        } else if searchViewModel.isLoading, searchViewModel.stops.isEmpty {
            ProgressView("Searching stops")
                .frame(maxWidth: .infinity)
                .frame(height: 140)
        } else if let errorMessage = searchViewModel.errorMessage,
                  searchViewModel.stops.isEmpty
        {
            ContentUnavailableView(
                "Couldn’t Load Stops",
                systemImage: "wifi.exclamationmark",
                description: Text(errorMessage)
            )
            .frame(maxWidth: .infinity)
            .frame(height: 180)
        } else if searchViewModel.stops.isEmpty {
            ContentUnavailableView(
                "No Stops Found",
                systemImage: "magnifyingglass",
                description: Text("Try a different stop name.")
            )
            .frame(maxWidth: .infinity)
            .frame(height: 180)
        } else {
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(searchViewModel.stops, id: \.id) { stop in
                        Button {
                            appNavigation.openMap(for: stop)
                            withAnimation(.easeOut(duration: 0.15)) {
                                isPresented = false
                            }
                        } label: {
                            SearchPageItemView(
                                label: stop.name,
                                routes: stop.platforms.flatMap(\.routes)
                            )
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 18)
                            .padding(.vertical, 14)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)

                        if stop.id != searchViewModel.stops.last?.id {
                            Rectangle()
                                .fill(.primary.opacity(0.1))
                                .frame(height: 1)
                                .padding(.horizontal, 18)
                        }
                    }
                }
            }
            .frame(maxHeight: 320)
        }
    }
}
