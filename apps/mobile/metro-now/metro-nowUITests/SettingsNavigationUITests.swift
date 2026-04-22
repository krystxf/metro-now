import XCTest

final class SettingsNavigationUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testAboutSubpageOpensAndReturns() {
        let app = launchPastWelcome()

        openSettings(in: app)

        let aboutLink = app.buttons["About"]
        XCTAssertTrue(
            aboutLink.waitForExistence(timeout: 5),
            "About row must be visible in the settings list"
        )
        aboutLink.tap()

        // The About page renders its own navigation title; wait for the
        // navigation bar to change rather than the body text, because the
        // body text (Share metro-now / Version / Build) depends on bundle
        // metadata that may differ in CI.
        XCTAssertTrue(
            app.navigationBars["About"].waitForExistence(timeout: 5),
            "Navigating to About must push a nav bar titled About"
        )
        XCTAssertTrue(
            app.staticTexts["Version"].waitForExistence(timeout: 5),
            "About subpage must render a Version row"
        )

        // Back button label is the previous nav title — swipe-back is flaky
        // in CI simulators, so we tap the explicit back button instead.
        let backButton = app.navigationBars["About"].buttons.firstMatch
        XCTAssertTrue(backButton.waitForExistence(timeout: 5))
        backButton.tap()

        XCTAssertTrue(
            app.navigationBars["Settings"].waitForExistence(timeout: 5),
            "Back navigation must return to the Settings root"
        )
    }

    func testShowTrafficToggleIsPresent() {
        let app = launchPastWelcome()

        openSettings(in: app)

        XCTAssertTrue(
            app.switches["Show traffic"].waitForExistence(timeout: 5),
            "Settings must expose the Show traffic toggle"
        )
    }

    // MARK: - helpers

    private func launchPastWelcome() -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["UITEST_RESET_STATE"]
        app.launchEnvironment["UITEST_HAS_SEEN_WELCOME"] = "1"
        app.launch()
        dismissSystemAlertIfNeeded(in: app)
        return app
    }

    private func openSettings(in app: XCUIApplication) {
        let settingsButton = app.buttons["button.open-settings"]
        XCTAssertTrue(settingsButton.waitForExistence(timeout: 5))
        settingsButton.tap()
        XCTAssertTrue(app.navigationBars["Settings"].waitForExistence(timeout: 5))
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
