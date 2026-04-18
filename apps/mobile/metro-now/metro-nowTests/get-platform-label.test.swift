// metro-now
// https://github.com/krystxf/metro-now

@testable import metro_now
import Testing

@Suite(.tags(.utils))
struct GetPlatformLabelTests {
    @Test("includes platform code when present")
    func includesCode() {
        let platform = ApiPlatform(
            id: "P1",
            latitude: 50.0,
            longitude: 14.0,
            name: "Můstek",
            code: "A",
            isMetro: false,
            routes: []
        )
        #expect(getPlatformLabel(platform) == "Můstek A")
    }

    @Test("returns name only when code is nil")
    func noCode() {
        let platform = ApiPlatform(
            id: "P1",
            latitude: 50.0,
            longitude: 14.0,
            name: "Praha hl.n.",
            code: nil,
            isMetro: false,
            routes: []
        )
        #expect(getPlatformLabel(platform) == "Praha hl.n.")
    }
}
