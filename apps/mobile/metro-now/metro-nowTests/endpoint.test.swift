// metro-now
// https://github.com/krystxf/metro-now

import Foundation
import Testing

@Test("ENDPOINT")
func endpoint() async throws {
    #expect(
        !ENDPOINT.contains("localhost"),
        "ENDPOINT should not contain localhost"
    )

    #expect(
        URL(string: ENDPOINT) != nil,
        "ENDPOINT should be valid URL"
    )
}
