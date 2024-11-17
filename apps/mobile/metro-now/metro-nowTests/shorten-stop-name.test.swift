// metro-now
// https://github.com/krystxf/metro-now

import Foundation
import Testing

@Suite("shortenStopName")
struct ShortenStopNameTests {
    @Test("static", arguments:
        zip([
            "Fallback",
            "Nemocnice Motol",
            "Jiřího z Poděbrad",
            "Pražského povstání",
            "Depo Hostivař",
            "Černý Most",
            "I. P. Pavlova",
        ],
        [
            "Fallback",
            "N. Motol",
            "J. z Poděbrad",
            "P. povstání",
            "D. Hostivař",
            "Černý Most",
            "I. P. Pavlova",
        ]))
    func testStaticShortenStopName(
        stopName: String,
        expected: String
    ) async throws {
        let shortened = shortenStopName(stopName)

        #expect(shortened == expected)
    }

    @Test("dynamic", arguments:
        zip([
            "Karlovo náměstí",
            "Masarykovo nádraží",
            "Nádraží Holešovice",
            "Nádraží Veleslavín",
            "Náměstí Míru",
        ],
        [
            "Karlovo nám.",
            "Masarykovo nádr.",
            "N. Holešovice",
            "N. Veleslavín",
            "Nám. Míru",
        ]))
    func testDynamicShortenStopName(
        stopName: String,
        expected: String
    ) async throws {
        let shortened = shortenStopName(stopName)

        #expect(shortened == expected)
    }
}
