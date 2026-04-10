// metro-now
// https://github.com/krystxf/metro-now

import MapboxMaps
import SwiftUI
import WidgetKit

private enum MapboxConfiguration {
    private static let environmentKey = "MAPBOX_ACCESS_TOKEN"
    private static let infoPlistKeys = ["MAPBOX_ACCESS_TOKEN", "MBXAccessToken"]

    static func applyAccessTokenIfAvailable() {
        if let accessToken = infoPlistAccessToken ?? environmentAccessToken {
            MapboxOptions.accessToken = accessToken
        }
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
                localizedTitle: "Favorites",
                localizedSubtitle: nil,
                icon: UIApplicationShortcutIcon(systemImageName: "star.fill")
            ),
            UIApplicationShortcutItem(
                type: QuickAction.map.rawValue,
                localizedTitle: "Map",
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

    init() {
        MapboxConfiguration.applyAccessTokenIfAvailable()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appDelegate)
                .task {
                    WidgetCenter.shared.reloadAllTimelines()
                }
        }
    }
}
