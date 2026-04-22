// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI
import UIKit

struct ContentView: View {
    @EnvironmentObject var appDelegate: AppDelegate
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    @StateObject var appNavigation = AppNavigationViewModel()
    @StateObject var networkMonitor = NetworkMonitor()
    @StateObject var locationModel = LocationViewModel()
    @StateObject var closestStopViewModel = ClosestStopPageViewModel()
    @StateObject var stopsViewModel = StopsViewModel()
    @StateObject var favoritesViewModel = FavoritesViewModel()
    @StateObject var infotextsViewModel = InfotextsViewModel()

    @AppStorage(AppStorageKeys.hasSeenWelcomeScreen.rawValue)
    var hasSeenWelcomeScreen = false

    @State var showNoInternetBanner = false
    @State var showWelcomeScreen: Bool = false
    @State var showInfotexts: Bool = false
    @State var infotextsPresentationDetent: PresentationDetent = .large
    @State var showSettingsSheet = false
    @State var showSearchSheet = false
    @State var showDummyQuickSearch = false
    @State var sidebarRoutePreviewItem: SheetIdItem?
    @State var sidebarStopDetailItem: ApiStop?
    @State var displayedPhoneTab: AppTab = .departures
    @State var displayedTabletSidebarTab: AppTab = .departures
    @State var userSidebarWidth: CGFloat?
    @GestureState var sidebarDragOffset: CGFloat = 0

    var isTabletLayout: Bool {
        let idiom = UIDevice.current.userInterfaceIdiom
        return (idiom == .pad || idiom == .mac) && horizontalSizeClass == .regular
    }

    var supportsQuickSearchShortcut: Bool {
        let idiom = UIDevice.current.userInterfaceIdiom
        return idiom == .pad || idiom == .mac
    }

    var shouldPresentSearchAsSheet: Bool {
        !isTabletLayout && horizontalSizeClass == .compact
    }

    var tabletSidebarContentInset: CGFloat {
        isTabletLayout ? TabletLayoutMetrics.contentInset : 0
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
            .sheet(isPresented: $showSettingsSheet) {
                settingsPageView
                    .presentationDetents([.large])
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
            if let hasSeenWelcomeOverride = UITestLaunchConfiguration.hasSeenWelcomeOverride {
                showWelcomeScreen = !hasSeenWelcomeOverride
            } else {
                showWelcomeScreen = !hasSeenWelcomeScreen
            }
            handleQuickAction(appDelegate.quickAction)
            syncDisplayedTabs(with: appNavigation.selectedTab)
        }
        .onChange(of: appDelegate.quickAction) { _, action in
            handleQuickAction(action)
        }
        .onChange(of: horizontalSizeClass) { _, _ in
            guard !shouldPresentSearchAsSheet, showSearchSheet else { return }
            showSearchSheet = false
        }
        .onChange(of: showInfotexts) { _, isPresented in
            guard isPresented else { return }
            infotextsPresentationDetent = .large
        }
        .onChange(of: displayedPhoneTab) { oldTab, newTab in
            handlePhoneTabChange(oldTab: oldTab, newTab: newTab)
        }
        .onChange(of: displayedTabletSidebarTab) { _, newTab in
            guard isTabletLayout, appNavigation.selectedTab != newTab else { return }
            appNavigation.selectedTab = newTab
        }
        .onChange(of: appNavigation.selectedTab) { _, newTab in
            handleSelectedTabChange(newTab)
        }
        .onReceive(networkMonitor.$isConnected) { isConnected in
            setShowNoInternetBanner(!isConnected)
        }
        .onReceive(closestStopViewModel.$nearbyStops) { nearbyStops in
            guard let nearbyStops else { return }
            stopsViewModel.seedIfEmpty(with: nearbyStops)
        }
        .environmentObject(appNavigation)
        .environmentObject(stopsViewModel)
        .environmentObject(infotextsViewModel)
    }

    func handleQuickAction(_ action: QuickAction?) {
        guard let action else { return }
        appDelegate.quickAction = nil
        switch action {
        case .map: appNavigation.selectedTab = .map
        case .favorites: appNavigation.selectedTab = .favorites
        }
    }

    func setShowNoInternetBanner(_ value: Bool) {
        withAnimation { showNoInternetBanner = value }
    }

    func dismissWelcomeScreen() {
        showWelcomeScreen = false
        hasSeenWelcomeScreen = true
    }

    func dismissSearchSheet() {
        showSearchSheet = false
    }

    func syncDisplayedTabs(with tab: AppTab) {
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

    private func handlePhoneTabChange(oldTab: AppTab, newTab: AppTab) {
        guard !isTabletLayout else { return }

        guard shouldPresentSearchAsSheet, newTab == .search else {
            guard appNavigation.selectedTab != newTab else { return }
            appNavigation.selectedTab = newTab
            return
        }

        displayedPhoneTab = oldTab
        presentSearchSheet()
    }

    private func handleSelectedTabChange(_ newTab: AppTab) {
        syncDisplayedTabs(with: newTab)

        guard !isTabletLayout else { return }

        if shouldPresentSearchAsSheet, newTab == .search {
            presentSearchSheet()
            return
        }

        guard shouldPresentSearchAsSheet, showSearchSheet, newTab != .search else { return }
        showSearchSheet = false
    }
}

#Preview {
    ContentView()
        .environmentObject(AppDelegate())
}
