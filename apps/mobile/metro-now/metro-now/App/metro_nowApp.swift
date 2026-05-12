// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI
import WidgetKit

@main
struct metro_nowApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @Environment(\.scenePhase) private var scenePhase

    init() {
        UITestLaunchConfiguration.applyIfNeeded()
        MapboxConfiguration.applyAccessTokenIfAvailable()
        #if targetEnvironment(macCatalyst)
            MacWindowTitlebar.startObserving()
        #endif

        // Let the map render through the translucent tablet sidebar:
        // Lists/TableViews/ScrollViews all paint an opaque default bg in UIKit.
        UITableView.appearance().backgroundColor = .clear
        UICollectionView.appearance().backgroundColor = .clear
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appDelegate)
                .task {
                    WidgetCenter.shared.reloadAllTimelines()
                }
                .onAppear {
                    MacWindowTitlebar.applyNow()
                }
        }
        .onChange(of: scenePhase) { _, newPhase in
            handleScenePhase(newPhase)
        }
    }

    private func handleScenePhase(_ newPhase: ScenePhase) {
        #if !targetEnvironment(macCatalyst)
            if #available(iOS 16.2, *) {
                switch newPhase {
                case .active:
                    Task { @MainActor in DeparturesLiveActivityManager.shared.onEnterForeground() }
                case .background:
                    Task { @MainActor in DeparturesLiveActivityManager.shared.onEnterBackground() }
                default:
                    break
                }
            }
        #endif
    }
}
