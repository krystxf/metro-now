import XCTest

final class SettingsContentUITests: XCTestCase {
    private static var sharedApp: XCUIApplication!

    override class func setUp() {
        super.setUp()
        let app = UITestAppLauncher.launchPastWelcome()
        UITestAppLauncher.openSettings(in: app)
        sharedApp = app
    }

    override class func tearDown() {
        sharedApp?.terminate()
        sharedApp = nil
        super.tearDown()
    }

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testSettingsSheetShowsSettingsScreenIdentifier() {
        let settingsRoot = Self.settingsRootElement(in: Self.sharedApp)

        XCTAssertTrue(
            settingsRoot.waitForExistence(timeout: 5),
            "Opening the settings sheet must surface the screen.settings identifier"
        )
    }

    func testSettingsSheetShowsNavigationTitle() {
        // The navigation bar title element lives in navigationBars rather than
        // the general query — query it specifically to avoid matching the
        // section header label with the same text that may appear elsewhere.
        XCTAssertTrue(
            Self.sharedApp.navigationBars["Settings"].waitForExistence(timeout: 5),
            "Settings navigation bar must be present when the sheet is open"
        )
    }

    func testSettingsSheetRendersClearCacheButton() {
        XCTAssertTrue(
            Self.sharedApp.buttons["Clear cache"].waitForExistence(timeout: 5),
            "Settings body must include the Clear cache action — if this is renamed, update the accessibility label expected here"
        )
    }

    private static func settingsRootElement(in app: XCUIApplication) -> XCUIElement {
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
}
