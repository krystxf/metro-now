import XCTest

enum UITestAppLauncher {
    static func makeConfiguredApp(hasSeenWelcome: Bool) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["UITEST_RESET_STATE"]
        app.launchEnvironment["UITEST_HAS_SEEN_WELCOME"] = hasSeenWelcome ? "1" : "0"
        return app
    }

    static func launchPastWelcome() -> XCUIApplication {
        let app = makeConfiguredApp(hasSeenWelcome: true)
        app.launch()
        dismissSystemAlertIfNeeded(in: app)
        return app
    }

    static func dismissSystemAlertIfNeeded(in app: XCUIApplication) {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let alert = springboard.alerts.firstMatch

        guard alert.waitForExistence(timeout: 2) else {
            return
        }

        let dismissButton = alert.buttons.element(boundBy: 0)
        guard dismissButton.exists else {
            return
        }

        dismissButton.tap()
        _ = app.wait(for: .runningForeground, timeout: 5)
    }

    static func openSettings(in app: XCUIApplication) {
        let settingsButton = app.buttons["button.open-settings"]
        _ = settingsButton.waitForExistence(timeout: 5)
        settingsButton.tap()
        _ = app.buttons["button.close-settings"].waitForExistence(timeout: 5)
    }

    static func closeSettingsIfOpen(in app: XCUIApplication) {
        let closeButton = app.buttons["button.close-settings"]
        guard closeButton.exists else { return }
        closeButton.tap()
        _ = app.buttons["button.open-settings"].waitForExistence(timeout: 5)
    }

    static func returnToSettingsRootIfNeeded(in app: XCUIApplication) {
        // If a prior test bailed inside a subpage, pop back so the next test
        // starts from the Settings root. Safe no-op if already at the root.
        guard !app.navigationBars["Settings"].exists else { return }
        let backButton = app.navigationBars.buttons.firstMatch
        if backButton.exists {
            backButton.tap()
            _ = app.navigationBars["Settings"].waitForExistence(timeout: 5)
        }
    }
}
