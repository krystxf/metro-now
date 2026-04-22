import XCTest

final class WelcomeFlowUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testWelcomeScreenIsVisibleOnFirstLaunch() {
        let app = configuredApp(hasSeenWelcome: false)

        app.launch()
        dismissSystemAlertIfNeeded(in: app)

        XCTAssertTrue(app.otherElements["screen.welcome"].waitForExistence(timeout: 5))
    }

    func testContinueDismissesWelcomeAndRevealsRoot() {
        let app = configuredApp(hasSeenWelcome: false)

        app.launch()
        dismissSystemAlertIfNeeded(in: app)

        let continueButton = app.buttons["button.continue-welcome"]
        XCTAssertTrue(continueButton.waitForExistence(timeout: 5))

        continueButton.tap()

        // After tapping continue, the welcome screen must disappear and the
        // root page (with the settings entry point) must become interactable.
        XCTAssertFalse(app.buttons["button.continue-welcome"].waitForExistence(timeout: 2))
        XCTAssertTrue(app.buttons["button.open-settings"].waitForExistence(timeout: 5))
    }

    func testWelcomeScreenDoesNotReappearAfterContinue() {
        let app = configuredApp(hasSeenWelcome: false)

        app.launch()
        dismissSystemAlertIfNeeded(in: app)

        let continueButton = app.buttons["button.continue-welcome"]
        XCTAssertTrue(continueButton.waitForExistence(timeout: 5))

        continueButton.tap()

        XCTAssertTrue(app.buttons["button.open-settings"].waitForExistence(timeout: 5))
        // Opening and closing settings must not bring the welcome back — the
        // dismissal flag should be persisted for the remainder of the session.
        app.buttons["button.open-settings"].tap()
        let closeButton = app.buttons["button.close-settings"]
        XCTAssertTrue(closeButton.waitForExistence(timeout: 5))
        closeButton.tap()

        XCTAssertFalse(app.buttons["button.continue-welcome"].waitForExistence(timeout: 2))
        XCTAssertTrue(app.buttons["button.open-settings"].waitForExistence(timeout: 5))
    }

    private func configuredApp(hasSeenWelcome: Bool) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["UITEST_RESET_STATE"]
        app.launchEnvironment["UITEST_HAS_SEEN_WELCOME"] = hasSeenWelcome ? "1" : "0"
        return app
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
