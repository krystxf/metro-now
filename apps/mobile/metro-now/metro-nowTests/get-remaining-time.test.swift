// metro-now
// https://github.com/krystxf/metro-now

import Foundation
import Testing

@Suite("getRemainingTime")
struct GetRemainingTimeTests {
    @Test(
        "zero",
        arguments: zip(
            [-0, 0, 0.1, -0.1],
            ["0s", "0s", "0s", "-0s"]
        )
    )
    func testGetRemainingTimeSeconds(
        remainingTime: Double,
        expected: String
    ) {
        #expect(getRemainingTime(remainingTime) == expected)
    }

    @Suite("future")
    struct GetRemainingTimeFutureTests {
        @Test(
            "seconds",
            arguments: zip(
                [1, 10, 59],
                ["1s", "10s", "59s"]
            )
        )
        func testGetRemainingTimeSeconds(
            remainingTime: Double,
            expected: String
        ) {
            #expect(getRemainingTime(remainingTime) == expected)
        }

        @Test(
            "minutes",
            arguments: zip(
                [60, 3540, 3599],
                ["1m 0s", "59m 0s", "59m 59s"]
            )
        )
        func testGetRemainingTimeMinutes(
            remainingTime: Double,
            expected: String
        ) {
            #expect(getRemainingTime(remainingTime) == expected)
        }

        @Test(
            "hours",
            arguments: zip(
                [
                    3600,
                    3660,
                    3661,
                    3659 + 3540,
                ],
                [
                    "1h 0m",
                    "1h 1m",
                    "1h 1m",
                    "1h 59m",
                ]
            )
        )
        func testGetRemainingTimeHours(
            remainingTime: Double,
            expected: String
        ) {
            #expect(getRemainingTime(remainingTime) == expected)
        }
    }

    @Suite("past")
    struct GetRemainingTimePastTests {
        @Test(
            "seconds",
            arguments: zip(
                [-1, -10, -59],
                ["-1s", "-10s", "-59s"]
            )
        )
        func testGetRemainingTimeSeconds(
            remainingTime: Double,
            expected: String
        ) {
            #expect(getRemainingTime(remainingTime) == expected)
        }

        @Test(
            "minutes",
            arguments: zip(
                [-60, -3540, -3599],
                ["-1m 0s", "-59m 0s", "-59m 59s"]
            )
        )
        func testGetRemainingTimeMinutes(
            remainingTime: Double,
            expected: String
        ) {
            #expect(getRemainingTime(remainingTime) == expected)
        }

        @Test(
            "hours",
            arguments: zip(
                [
                    -3600,
                    -3660,
                    -3661,
                    -3659 - 3540,
                ],
                [
                    "-1h 0m",
                    "-1h 1m",
                    "-1h 1m",
                    "-1h 59m",
                ]
            )
        )
        func testGetRemainingTimeHours(
            remainingTime: Double,
            expected: String
        ) {
            #expect(getRemainingTime(remainingTime) == expected)
        }
    }
}
