//
//  timeUtilsTests.swift
//  metro-now-tests
//
//  Created by Kryštof Krátký on 15.05.2024.
//

@testable import metro_now
import XCTest

let SECONDS_FROM_NOW_TESTS_ACCURACY = 1 // seconds

final class timeUtilsTests: XCTestCase {
    func testSecondsFromNowWithFutureDate() {
        let now = Date.now
        let futureDate = now.addingTimeInterval(60)

        let result = secondsFromNow(futureDate)

        XCTAssert(abs(result - 60) <= SECONDS_FROM_NOW_TESTS_ACCURACY)
    }

    func testSecondsFromNowWithPastDate() {
        let now = Date.now
        let pastDate = now.addingTimeInterval(-30)

        let result = secondsFromNow(pastDate)

        XCTAssert(abs(result + 30) <= SECONDS_FROM_NOW_TESTS_ACCURACY)
    }

    func testSecondsFromNowWithCurrentDate() {
        let now = Date.now

        let result = secondsFromNow(now)

        XCTAssert(abs(result) <= SECONDS_FROM_NOW_TESTS_ACCURACY)
    }

    func testSecondsFromNowWithPrecision() {
        let now = Date()
        let almostFutureDate = now.addingTimeInterval(2)

        let result = secondsFromNow(almostFutureDate)

        XCTAssert(abs(result - 2) <= SECONDS_FROM_NOW_TESTS_ACCURACY)
    }

    // MARK: - outputs with seconds

    /// should show positive and negative or zero seconds without any issues

    func testsFormatTimePositiveSeconds() {
        /// init variables for testing
        var seconds: Int
        var result: String
        var expectedResult: String

        /// test 1
        seconds = 40
        result = formatTime(seconds: seconds)
        expectedResult = "40s"

        XCTAssertEqual(result, expectedResult)

        /// test 2
        seconds = 1
        result = formatTime(seconds: seconds)
        expectedResult = "1s"

        XCTAssertEqual(result, expectedResult)

        /// test 3
        seconds = 59
        result = formatTime(seconds: seconds)
        expectedResult = "59s"

        XCTAssertEqual(result, expectedResult)
    }

    func testsFormatTimeNegativeSeconds() {
        /// init variables for testing
        var seconds: Int
        var result: String
        var expectedResult: String

        /// test 1
        seconds = -40
        result = formatTime(seconds: seconds)
        expectedResult = "-40s"

        XCTAssertEqual(result, expectedResult)

        /// test 2
        seconds = -1
        result = formatTime(seconds: seconds)
        expectedResult = "-1s"

        XCTAssertEqual(result, expectedResult)

        /// test 3
        seconds = -59
        result = formatTime(seconds: seconds)
        expectedResult = "-59s"

        XCTAssertEqual(result, expectedResult)

        /// test 4
        seconds = -47
        result = formatTime(seconds: seconds)
        expectedResult = "-47s"

        XCTAssertEqual(result, expectedResult)
    }

    func testsFormatTimeZeroSeconds() {
        /// init variables for testing
        var seconds: Int
        var result: String
        var expectedResult: String

        /// test 1
        seconds = 0
        result = formatTime(seconds: seconds)
        expectedResult = "0s"

        XCTAssertEqual(result, expectedResult)

        /// test 2
        seconds = -0
        result = formatTime(seconds: seconds)
        expectedResult = "0s"

        XCTAssertEqual(result, expectedResult)
    }

    // MARK: - outputs with minutes

    /// should show minutes and seconds (if seconds is > 0)

    func testsFormatTimePositiveMinutes() {
        /// init variables for testing
        var seconds: Int
        var result: String
        var expectedResult: String

        /// test 1
        seconds = 60
        result = formatTime(seconds: seconds)
        expectedResult = "1m"

        XCTAssertEqual(result, expectedResult)

        /// test 2
        seconds = 61
        result = formatTime(seconds: seconds)
        expectedResult = "1m 1s"

        XCTAssertEqual(result, expectedResult)

        /// test 3
        seconds = 119
        result = formatTime(seconds: seconds)
        expectedResult = "1m 59s"

        XCTAssertEqual(result, expectedResult)

        /// test 4
        seconds = 3540
        result = formatTime(seconds: seconds)
        expectedResult = "59m"

        XCTAssertEqual(result, expectedResult)

        /// test 5
        seconds = 3599
        result = formatTime(seconds: seconds)
        expectedResult = "59m 59s"

        XCTAssertEqual(result, expectedResult)
    }

    func testsFormatTimeNegativeMinutes() {
        /// init variables for testing
        var seconds: Int
        var result: String
        var expectedResult: String

        /// test 1
        seconds = -60
        result = formatTime(seconds: seconds)
        expectedResult = "-1m"

        XCTAssertEqual(result, expectedResult)

        /// test 2
        seconds = -61
        result = formatTime(seconds: seconds)
        expectedResult = "-1m 1s"

        XCTAssertEqual(result, expectedResult)

        /// test 3
        seconds = -119
        result = formatTime(seconds: seconds)
        expectedResult = "-1m 59s"

        XCTAssertEqual(result, expectedResult)

        /// test 4
        seconds = -3540
        result = formatTime(seconds: seconds)
        expectedResult = "-59m"

        XCTAssertEqual(result, expectedResult)

        /// test 5
        seconds = -3599
        result = formatTime(seconds: seconds)
        expectedResult = "-59m 59s"

        XCTAssertEqual(result, expectedResult)
    }

    // MARK: - outputs with hours

    /// shouldn't return seconds if value > 1hr

    func testsFormatTimePositiveHours() {
        /// init variables for testing
        var seconds: Int
        var result: String
        var expectedResult: String

        /// test 1
        seconds = 3600
        result = formatTime(seconds: seconds)
        expectedResult = "1h"

        XCTAssertEqual(result, expectedResult)

        /// test 2
        seconds = 3601
        result = formatTime(seconds: seconds)
        expectedResult = "1h"

        XCTAssertEqual(result, expectedResult)

        /// test 3
        seconds = 3659
        result = formatTime(seconds: seconds)
        expectedResult = "1h"

        XCTAssertEqual(result, expectedResult)

        /// test 4
        seconds = 3660
        result = formatTime(seconds: seconds)
        expectedResult = "1h 1m"

        XCTAssertEqual(result, expectedResult)

        /// test 5
        seconds = 3661
        result = formatTime(seconds: seconds)
        expectedResult = "1h 1m"

        XCTAssertEqual(result, expectedResult)

        /// test 6
        seconds = 7199
        result = formatTime(seconds: seconds)
        expectedResult = "1h 59m"

        XCTAssertEqual(result, expectedResult)

        /// test 7
        seconds = 7200
        result = formatTime(seconds: seconds)
        expectedResult = "2h"

        /// test 8
        seconds = 7201
        result = formatTime(seconds: seconds)
        expectedResult = "2h"

        XCTAssertEqual(result, expectedResult)

        /// test 10
        seconds = 7260
        result = formatTime(seconds: seconds)
        expectedResult = "2h 1m"

        XCTAssertEqual(result, expectedResult)

        /// test 11
        seconds = 43200
        result = formatTime(seconds: seconds)
        expectedResult = "12h"

        XCTAssertEqual(result, expectedResult)

        /// test 11
        seconds = 43201
        result = formatTime(seconds: seconds)
        expectedResult = ">12h"

        XCTAssertEqual(result, expectedResult)

        /// test 13
        seconds = Int.max
        result = formatTime(seconds: seconds)
        expectedResult = ">12h"

        XCTAssertEqual(result, expectedResult)
    }

    func testsFormatTimeNegativeHours() {
        /// init variables for testing
        var seconds: Int
        var result: String
        var expectedResult: String

        /// test 1
        seconds = -3600
        result = formatTime(seconds: seconds)
        expectedResult = "-1h"

        XCTAssertEqual(result, expectedResult)

        /// test 2
        seconds = -3601
        result = formatTime(seconds: seconds)
        expectedResult = "-1h"

        XCTAssertEqual(result, expectedResult)

        /// test 3
        seconds = -3659
        result = formatTime(seconds: seconds)
        expectedResult = "-1h"

        XCTAssertEqual(result, expectedResult)

        /// test 4
        seconds = -3660
        result = formatTime(seconds: seconds)
        expectedResult = "-1h 1m"

        XCTAssertEqual(result, expectedResult)

        /// test 5
        seconds = -3661
        result = formatTime(seconds: seconds)
        expectedResult = "-1h 1m"

        XCTAssertEqual(result, expectedResult)

        /// test 6
        seconds = -7199
        result = formatTime(seconds: seconds)
        expectedResult = "-1h 59m"

        XCTAssertEqual(result, expectedResult)

        /// test 7
        seconds = -7200
        result = formatTime(seconds: seconds)
        expectedResult = "-2h"

        /// test 8
        seconds = -7201
        result = formatTime(seconds: seconds)
        expectedResult = "-2h"

        XCTAssertEqual(result, expectedResult)

        /// test 10
        seconds = -7260
        result = formatTime(seconds: seconds)
        expectedResult = "-2h 1m"

        XCTAssertEqual(result, expectedResult)

        /// test 11
        seconds = -43200
        result = formatTime(seconds: seconds)
        expectedResult = "-12h"

        XCTAssertEqual(result, expectedResult)

        /// test 11
        seconds = -43201
        result = formatTime(seconds: seconds)
        expectedResult = "- >12h"

        XCTAssertEqual(result, expectedResult)

        /// test 13
        seconds = Int.min
        result = formatTime(seconds: seconds)
        expectedResult = "- >12h"

        XCTAssertEqual(result, expectedResult)
    }
}
