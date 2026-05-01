import XCTest

final class WelcomeFlowUITests: XCTestCase {
    // Tests here exercise first-launch behavior and the persistence of the
    // welcome-dismissal flag, so each test intentionally launches a fresh
    // app instance. Do not migrate this class to a class-level setUp.

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testWelcomeScreenIsVisibleOnFirstLaunch() {
        let app = UITestAppLauncher.makeConfiguredApp(hasSeenWelcome: false)

        app.launch()
        UITestAppLauncher.dismissSystemAlertIfNeeded(in: app)

        XCTAssertTrue(
            continueButton(in: app).waitForExistence(timeout: 5),
            "First launch must present the welcome sheet with a visible continue action"
        )
    }

    func testContinueDismissesWelcomeAndRevealsRoot() {
        let app = UITestAppLauncher.makeConfiguredApp(hasSeenWelcome: false)

        app.launch()
        UITestAppLauncher.dismissSystemAlertIfNeeded(in: app)

        let continueAction = continueButton(in: app)
        XCTAssertTrue(continueAction.waitForExistence(timeout: 5))

        continueAction.tap()

        // After tapping continue, the welcome screen must disappear and the
        // root page (with the settings entry point) must become interactable.
        XCTAssertFalse(continueButton(in: app).waitForExistence(timeout: 2))
        XCTAssertTrue(app.buttons["button.open-settings"].waitForExistence(timeout: 5))
    }

    func testWelcomeScreenDoesNotReappearAfterContinue() {
        let app = UITestAppLauncher.makeConfiguredApp(hasSeenWelcome: false)

        app.launch()
        UITestAppLauncher.dismissSystemAlertIfNeeded(in: app)

        let continueAction = continueButton(in: app)
        XCTAssertTrue(continueAction.waitForExistence(timeout: 5))

        continueAction.tap()

        XCTAssertTrue(app.buttons["button.open-settings"].waitForExistence(timeout: 5))
        // Opening and closing settings must not bring the welcome back — the
        // dismissal flag should be persisted for the remainder of the session.
        app.buttons["button.open-settings"].tap()
        let closeButton = app.buttons["button.close-settings"]
        XCTAssertTrue(closeButton.waitForExistence(timeout: 5))
        closeButton.tap()

        XCTAssertFalse(continueButton(in: app).waitForExistence(timeout: 2))
        XCTAssertTrue(app.buttons["button.open-settings"].waitForExistence(timeout: 5))
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
