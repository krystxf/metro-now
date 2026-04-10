// metro-now
// https://github.com/krystxf/metro-now

import Foundation
import Testing

@Suite("endpoint", .tags(.api))
struct EndpointTests {
    @Test("should not contain localhost")
    func notLocalhost() {
        #expect(
            !API_URL.contains("localhost"),
            "ENDPOINT should not contain localhost"
        )
    }

    @Test("should be valid URL")
    func validURL() {
        #expect(
            URL(string: API_URL) != nil,
            "ENDPOINT should be valid URL"
        )
    }
}
