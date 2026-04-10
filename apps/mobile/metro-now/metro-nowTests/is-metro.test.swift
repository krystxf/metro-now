// metro-now
// https://github.com/krystxf/metro-now

import Testing

@Suite(.tags(.routes))
struct IsMetroTests {
    @Test("metro lines", arguments: ["A", "B", "C"])
    func metroLines(routeName: String) {
        #expect(isMetro(routeName))
    }

    @Test("non-metro routes", arguments: ["1", "22", "S1", "X100", "D", "AB", "", "a", "b", "c"])
    func nonMetroRoutes(routeName: String) {
        #expect(!isMetro(routeName))
    }
}
