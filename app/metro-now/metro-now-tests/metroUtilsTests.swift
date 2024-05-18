//
//  metroUtilsTests.swift
//  metro-now-tests
//
//  Created by Kryštof Krátký on 15.05.2024.
//

import CoreLocation
@testable import metro_now
import SwiftUI
import XCTest

final class metroUtilsTests: XCTestCase {
    // MARK: - test if function returns correct color

    /// should show positive and negative or zero seconds without any issues

    func testsGetMetroLineColorOutputWrongString() {
        /// init variables for testing
        var lineLetter: String

        /// test if function throws an error
        lineLetter = "other"
        _ = getMetroLineColor(lineLetter)
    }

    func testsGetMetroLineColorOutputLowercase() {
        /// init variables for testing
        var lineLetter: String
        var result: Color
        var expectedResult: Color

        /// test 1
        lineLetter = "a"
        result = getMetroLineColor(lineLetter)
        expectedResult = Color.green

        XCTAssertEqual(result, expectedResult)

        /// test 2
        lineLetter = "b"
        result = getMetroLineColor(lineLetter)
        expectedResult = Color.yellow

        XCTAssertEqual(result, expectedResult)

        /// test 3
        lineLetter = "c"
        result = getMetroLineColor(lineLetter)
        expectedResult = Color.red

        XCTAssertEqual(result, expectedResult)
    }

    func testsGetMetroLineColorOutputEnum() {
        /// init variables for testing
        var result: Color
        var expectedResult: Color

        /// test 1
        result = getMetroLineColor(.A)
        expectedResult = Color.green

        XCTAssertEqual(result, expectedResult)

        /// test 2
        result = getMetroLineColor(.B)
        expectedResult = Color.yellow

        XCTAssertEqual(result, expectedResult)

        /// test 3
        result = getMetroLineColor(.C)
        expectedResult = Color.red

        XCTAssertEqual(result, expectedResult)
    }

    func testsGetMetroLineColorOutputUppercase() {
        /// init variables for testing
        var lineLetter: String
        var result: Color
        var expectedResult: Color

        /// test 1
        lineLetter = "A"
        result = getMetroLineColor(lineLetter)
        expectedResult = Color.green

        XCTAssertEqual(result, expectedResult)

        /// test 2
        lineLetter = "B"
        result = getMetroLineColor(lineLetter)
        expectedResult = Color.yellow

        XCTAssertEqual(result, expectedResult)

        /// test 3
        lineLetter = "C"
        result = getMetroLineColor(lineLetter)
        expectedResult = Color.red

        XCTAssertEqual(result, expectedResult)
    }

    func testsGetClosestStationFromGeoJSON() {
        /// init variables for testing
        var location: CLLocation
        var result: MetroStationsGeoJSONFeature?

        /// test 1
        location = CLLocation(
            latitude: 50.078453,
            longitude: 14.430676
        )
        result = getClosestStationFromGeoJSON(
            location: location
        )

        XCTAssertEqual(
            result?.properties.name,
            "Muzeum"
        )

        /// test 2
        location = CLLocation(
            latitude: 50.079591,
            longitude: 14.430883
        )
        result = getClosestStationFromGeoJSON(
            location: location
        )

        XCTAssertEqual(
            result?.properties.name,
            "Muzeum"
        )

        /// test 3
        location = CLLocation(
            latitude: 50.080094,
            longitude: 14.429663
        )
        result = getClosestStationFromGeoJSON(
            location: location
        )

        XCTAssertEqual(
            result?.properties.name,
            "Muzeum"
        )

        /// test 4
        location = CLLocation(
            latitude: 50.074929,
            longitude: 14.430177
        )
        result = getClosestStationFromGeoJSON(
            location: location
        )

        XCTAssertEqual(
            result?.properties.name,
            "I. P. Pavlova"
        )

        /// test 5
        location = CLLocation(
            latitude: 50.075499,
            longitude: 14.322204
        )
        result = getClosestStationFromGeoJSON(
            location: location
        )

        XCTAssertEqual(
            result?.properties.name,
            "Nemocnice Motol"
        )

        /// test 6
        location = CLLocation(
            latitude: 50.047485,
            longitude: 14.460385
        )
        result = getClosestStationFromGeoJSON(
            location: location
        )

        XCTAssertEqual(
            result?.properties.name,
            "Kačerov"
        )

        /// test 7
        location = CLLocation(
            latitude: 50.040648,
            longitude: 14.456518
        )
        result = getClosestStationFromGeoJSON(
            location: location
        )

        XCTAssertEqual(
            result?.properties.name,
            "Kačerov"
        )
    }
}
