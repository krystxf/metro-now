import XCTest

final class SettingsContentUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testSettingsSheetShowsSettingsScreenIdentifier() {
        let app = launchPastWelcome()

        openSettings(in: app)

        let settingsRoot = settingsRootElement(in: app)

        XCTAssertTrue(
            settingsRoot.waitForExistence(timeout: 5),
            "Opening the settings sheet must surface the screen.settings identifier"
        )
    }

    func testSettingsSheetShowsNavigationTitle() {
        let app = launchPastWelcome()

        openSettings(in: app)

        // The navigation bar title element lives in navigationBars rather than
        // the general query — query it specifically to avoid matching the
        // section header label with the same text that may appear elsewhere.
        XCTAssertTrue(
            app.navigationBars["Settings"].waitForExistence(timeout: 5),
            "Settings navigation bar must be present when the sheet is open"
        )
    }

    func testSettingsSheetRendersClearCacheButton() {
        let app = launchPastWelcome()

        openSettings(in: app)

        XCTAssertTrue(
            app.buttons["Clear cache"].waitForExistence(timeout: 5),
            "Settings body must include the Clear cache action — if this is renamed, update the accessibility label expected here"
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
        XCTAssertTrue(app.buttons["button.close-settings"].waitForExistence(timeout: 5))
    }

    private func settingsRootElement(in app: XCUIApplication) -> XCUIElement {
        let queries: [XCUIElementQuery] = [
            app.otherElements,
            app.tables,
            app.collectionViews,
            app.scrollViews,
        ]

        for query in queries {
            let candidate = query["screen.settings"]
            if candidate.exists {
                return candidate
            }
        }

        return app.descendants(matching: .any)["screen.settings"]
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
