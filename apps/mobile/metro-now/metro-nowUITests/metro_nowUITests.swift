import XCTest

final class metro_nowUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testFirstLaunchShowsWelcomeScreen() {
        let app = configuredApp(hasSeenWelcome: false)

        app.launch()
        dismissSystemAlertIfNeeded(in: app)

        XCTAssertTrue(continueButton(in: app).waitForExistence(timeout: 5))
    }

    func testLaunchCanSkipWelcomeScreen() {
        let app = configuredApp(hasSeenWelcome: true)

        app.launch()
        dismissSystemAlertIfNeeded(in: app)

        XCTAssertFalse(continueButton(in: app).waitForExistence(timeout: 2))
        XCTAssertTrue(app.buttons["button.open-settings"].waitForExistence(timeout: 5))
    }

    func testSettingsSheetCanOpenAndClose() {
        let app = configuredApp(hasSeenWelcome: true)

        app.launch()
        dismissSystemAlertIfNeeded(in: app)

        let settingsButton = app.buttons["button.open-settings"]
        XCTAssertTrue(settingsButton.waitForExistence(timeout: 5))

        settingsButton.tap()

        let closeButton = app.buttons["button.close-settings"]
        XCTAssertTrue(closeButton.waitForExistence(timeout: 5))

        closeButton.tap()

        XCTAssertFalse(closeButton.waitForExistence(timeout: 2))
        XCTAssertTrue(settingsButton.waitForExistence(timeout: 5))
    }

    private func configuredApp(hasSeenWelcome: Bool) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["UITEST_RESET_STATE"]
        app.launchEnvironment["UITEST_HAS_SEEN_WELCOME"] = hasSeenWelcome ? "1" : "0"
        return app
    }

    private func continueButton(in app: XCUIApplication) -> XCUIElement {
        let identifiedButton = app.buttons["button.continue-welcome"]
        if identifiedButton.exists {
            return identifiedButton
        }

        let labeledButton = app.buttons["Continue"]
        if labeledButton.exists {
            return labeledButton
        }

        return app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Continue")).firstMatch
    }

    private func dismissSystemAlertIfNeeded(in app: XCUIApplication) {
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
}
