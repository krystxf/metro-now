import XCTest

final class SettingsNavigationUITests: XCTestCase {
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
        // Guard against a prior failed test leaving us on a subpage.
        UITestAppLauncher.returnToSettingsRootIfNeeded(in: Self.sharedApp)
    }

    func testAboutSubpageOpensAndReturns() throws {
        let app = try XCTUnwrap(Self.sharedApp)

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
        XCTAssertTrue(
            Self.sharedApp.switches["Show traffic"].waitForExistence(timeout: 5),
            "Settings must expose the Show traffic toggle"
        )
    }
}
