//
//  jsonUtilsTests.swift
//  metro-now-tests
//
//  Created by Kryštof Krátký on 15.05.2024.
//

@testable import metro_now
import XCTest

final class jsonUtilsTests: XCTestCase {
    // MARK: - check if JSON data loads successfully

    func testMetroRoutesGeoJSON() {
        let result: MetroRoutesGeoJSON? = getParsedJSONFile(.METRO_ROUTES_FILE)

        XCTAssertNotNil(result)
    }

    func testMetroStationsGeoJSON() {
        let result: MetroStationsGeoJSON? = getParsedJSONFile(.METRO_STATIONS_FILE)
        XCTAssertNotNil(result)
    }
}
