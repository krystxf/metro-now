// metro-now
// https://github.com/krystxf/metro-now

import Foundation
import Testing

@Test("ENDPOINT")
func endpoint() async throws {
    #expect(
        !API_URL.contains("localhost"),
        "ENDPOINT should not contain localhost"
    )

    #expect(
        URL(string: API_URL) != nil,
        "ENDPOINT should be valid URL"
    )
}
