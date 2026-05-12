// metro-now
// https://github.com/krystxf/metro-now

import UIKit

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
