import Foundation
@testable import metro_now
import Testing

struct UITestLaunchConfigurationTests {
    @Test("resets persisted state and seeds the welcome flag from test configuration")
    func appliesResetAndWelcomeFlags() throws {
        let suiteName = "UITestLaunchConfigurationTests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suiteName))
        defer {
            defaults.removePersistentDomain(forName: suiteName)
        }

        defaults.set(false, forKey: AppStorageKeys.hasSeenWelcomeScreen.rawValue)
        defaults.set("persisted", forKey: "custom-key")

        UITestLaunchConfiguration.apply(
            arguments: ["UITEST_RESET_STATE"],
            environment: ["UITEST_HAS_SEEN_WELCOME": "1"],
            defaults: defaults,
            bundleIdentifier: suiteName
        )

        #expect(defaults.string(forKey: "custom-key") == nil)
        #expect(defaults.bool(forKey: AppStorageKeys.hasSeenWelcomeScreen.rawValue))
    }

    @Test("does nothing when no UI test flags are present")
    func skipsWithoutFlags() throws {
        let suiteName = "UITestLaunchConfigurationTests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suiteName))
        defer {
            defaults.removePersistentDomain(forName: suiteName)
        }

        defaults.set("persisted", forKey: "custom-key")

        UITestLaunchConfiguration.apply(
            arguments: [],
            environment: [:],
            defaults: defaults,
            bundleIdentifier: suiteName
        )

        #expect(defaults.string(forKey: "custom-key") == "persisted")
    }
}
