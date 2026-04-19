// metro-now
// https://github.com/krystxf/metro-now

import MapboxMaps
import SwiftUI
import WidgetKit

private enum UITestLaunchConfiguration {
    private static let resetStateArgument = "UITEST_RESET_STATE"
    private static let hasSeenWelcomeEnvironmentKey = "UITEST_HAS_SEEN_WELCOME"

    static func applyIfNeeded() {
        let processInfo = ProcessInfo.processInfo
        let arguments = processInfo.arguments
        let environment = processInfo.environment

        guard arguments.contains(resetStateArgument)
            || environment[hasSeenWelcomeEnvironmentKey] != nil
        else {
            return
        }

        let defaults = UserDefaults.standard

        if arguments.contains(resetStateArgument),
           let bundleIdentifier = Bundle.main.bundleIdentifier
        {
            defaults.removePersistentDomain(forName: bundleIdentifier)
        }

        if let hasSeenWelcome = environment[hasSeenWelcomeEnvironmentKey] {
            defaults.set(hasSeenWelcome == "1", forKey: AppStorageKeys.hasSeenWelcomeScreen.rawValue)
        }
    }
}

private enum MapboxConfiguration {
    private static let environmentKey = "MAPBOX_ACCESS_TOKEN"
    private static let infoPlistKeys = ["MAPBOX_ACCESS_TOKEN", "MBXAccessToken"]

    static func applyAccessTokenIfAvailable() {
        guard let token = infoPlistAccessToken ?? environmentAccessToken else {
            assertionFailure("Mapbox access token not found. Add it to Secrets.xcconfig.")
            return
        }
        MapboxOptions.accessToken = token
    }

    private static var infoPlistAccessToken: String? {
        for key in infoPlistKeys {
            if let value = Bundle.main.object(forInfoDictionaryKey: key) as? String,
               !value.isEmpty
            {
                return value
            }
        }

        return nil
    }

    private static var environmentAccessToken: String? {
        guard let value = ProcessInfo.processInfo.environment[environmentKey],
              !value.isEmpty
        else {
            return nil
        }

        return value
    }
}

enum QuickAction: String {
    case map
    case favorites
}

class AppDelegate: NSObject, UIApplicationDelegate, ObservableObject {
    @Published var quickAction: QuickAction?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        application.shortcutItems = [
            UIApplicationShortcutItem(
                type: QuickAction.favorites.rawValue,
                localizedTitle: NSLocalizedString(
                    "Favorites",
                    comment: "Quick action title for favorites"
                ),
                localizedSubtitle: nil,
                icon: UIApplicationShortcutIcon(systemImageName: "star")
            ),
            UIApplicationShortcutItem(
                type: QuickAction.map.rawValue,
                localizedTitle: NSLocalizedString(
                    "Map",
                    comment: "Quick action title for map"
                ),
                localizedSubtitle: nil,
                icon: UIApplicationShortcutIcon(systemImageName: "map")
            ),
        ]

        if let shortcutItem = launchOptions?[.shortcutItem] as? UIApplicationShortcutItem {
            quickAction = QuickAction(rawValue: shortcutItem.type)
        }

        return true
    }

    func application(
        _: UIApplication,
        performActionFor shortcutItem: UIApplicationShortcutItem,
        completionHandler: @escaping (Bool) -> Void
    ) {
        quickAction = QuickAction(rawValue: shortcutItem.type)
        completionHandler(true)
    }
}

@main
struct metro_nowApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @Environment(\.scenePhase) private var scenePhase

    init() {
        UITestLaunchConfiguration.applyIfNeeded()
        MapboxConfiguration.applyAccessTokenIfAvailable()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .tint(.brandPrimary)
                .environmentObject(appDelegate)
                .task {
                    WidgetCenter.shared.reloadAllTimelines()
                }
        }
        .onChange(of: scenePhase) { _, newPhase in
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
}
