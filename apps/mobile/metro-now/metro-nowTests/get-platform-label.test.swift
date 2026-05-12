// metro-now
// https://github.com/krystxf/metro-now

@testable import metro_now
import Testing

@Suite(.tags(.utils))
struct GetPlatformLabelTests {
    @Test("prefers direction over code when present")
    func prefersDirection() {
        let platform = ApiPlatform(
            id: "P1",
            latitude: 50.0,
            longitude: 14.0,
            name: "Můstek",
            code: "A",
            direction: "Dejvická",
            isMetro: true,
            routes: []
        )
        #expect(getPlatformLabel(platform) == "Můstek → Dejvická")
    }

    @Test("falls back to platform code when direction is nil")
    func fallsBackToCode() {
        let platform = ApiPlatform(
            id: "P1",
            latitude: 50.0,
            longitude: 14.0,
            name: "Můstek",
            code: "A",
            direction: nil,
            isMetro: false,
            routes: []
        )
        #expect(getPlatformLabel(platform) == "Můstek A")
    }

    @Test("returns name only when direction and code are nil")
    func nameOnly() {
        let platform = ApiPlatform(
            id: "P1",
            latitude: 50.0,
            longitude: 14.0,
            name: "Praha hl.n.",
            code: nil,
            direction: nil,
            isMetro: false,
            routes: []
        )
        #expect(getPlatformLabel(platform) == "Praha hl.n.")
    }
}
