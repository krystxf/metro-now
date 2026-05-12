// metro-now
// https://github.com/krystxf/metro-now

import Foundation

private let iso8601WithFraction: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
}()

private let iso8601NoFraction: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime]
    return f
}()

func parseBackendISO8601(_ string: String) -> Date? {
    iso8601WithFraction.date(from: string)
        ?? iso8601NoFraction.date(from: string)
}
