// metro-now
// https://github.com/krystxf/metro-now

import Foundation

enum UITestLaunchConfiguration {
    private static let resetStateArgument = "UITEST_RESET_STATE"
    private static let hasSeenWelcomeEnvironmentKey = "UITEST_HAS_SEEN_WELCOME"
    private(set) static var hasSeenWelcomeOverride: Bool?

    static func applyIfNeeded() {
        let processInfo = ProcessInfo.processInfo

        apply(
            arguments: processInfo.arguments,
            environment: processInfo.environment
        )
    }

    static func apply(
        arguments: [String],
        environment: [String: String],
        defaults: UserDefaults = .standard,
        bundleIdentifier: String? = Bundle.main.bundleIdentifier
    ) {
        hasSeenWelcomeOverride = environment[hasSeenWelcomeEnvironmentKey].map {
            $0 == "1"
        }

        guard arguments.contains(resetStateArgument)
            || environment[hasSeenWelcomeEnvironmentKey] != nil
        else {
            return
        }

        if arguments.contains(resetStateArgument),
           let bundleIdentifier
        {
            defaults.removePersistentDomain(forName: bundleIdentifier)
        }

        if let hasSeenWelcome = environment[hasSeenWelcomeEnvironmentKey] {
            defaults.set(hasSeenWelcome == "1", forKey: AppStorageKeys.hasSeenWelcomeScreen.rawValue)
        }
    }
}
