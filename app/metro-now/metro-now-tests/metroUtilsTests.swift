//
//  metroUtilsTests.swift
//  metro-now-tests
//
//  Created by Kryštof Krátký on 15.05.2024.
//

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
        var lineLetter: String
        var result: Color
        var expectedResult: Color

        /// test 1
        lineLetter = MetroLine.A.rawValue
        result = getMetroLineColor(lineLetter)
        expectedResult = Color.green

        XCTAssertEqual(result, expectedResult)

        /// test 2
        lineLetter = MetroLine.B.rawValue
        result = getMetroLineColor(lineLetter)
        expectedResult = Color.yellow

        XCTAssertEqual(result, expectedResult)

        /// test 3
        lineLetter = MetroLine.C.rawValue
        result = getMetroLineColor(lineLetter)
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
}
