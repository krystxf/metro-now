import XCTest

final class metro_nowUITests: XCTestCase {
    // Tests here mix welcome-seen and first-launch configurations, so each
    // test intentionally launches a fresh app instance. Do not migrate this
    // class to a class-level setUp.

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testFirstLaunchShowsWelcomeScreen() {
        let app = UITestAppLauncher.makeConfiguredApp(hasSeenWelcome: false)

        app.launch()
        UITestAppLauncher.dismissSystemAlertIfNeeded(in: app)

        XCTAssertTrue(continueButton(in: app).waitForExistence(timeout: 5))
    }

    func testLaunchCanSkipWelcomeScreen() {
        let app = UITestAppLauncher.makeConfiguredApp(hasSeenWelcome: true)

        app.launch()
        UITestAppLauncher.dismissSystemAlertIfNeeded(in: app)

        XCTAssertFalse(continueButton(in: app).waitForExistence(timeout: 2))
        XCTAssertTrue(app.buttons["button.open-settings"].waitForExistence(timeout: 5))
    }

    func testSettingsSheetCanOpenAndClose() {
        let app = UITestAppLauncher.makeConfiguredApp(hasSeenWelcome: true)

        app.launch()
        UITestAppLauncher.dismissSystemAlertIfNeeded(in: app)

        let settingsButton = app.buttons["button.open-settings"]
        XCTAssertTrue(settingsButton.waitForExistence(timeout: 5))

        settingsButton.tap()

        let closeButton = app.buttons["button.close-settings"]
        XCTAssertTrue(closeButton.waitForExistence(timeout: 5))

        closeButton.tap()

        XCTAssertFalse(closeButton.waitForExistence(timeout: 2))
        XCTAssertTrue(settingsButton.waitForExistence(timeout: 5))
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
}
