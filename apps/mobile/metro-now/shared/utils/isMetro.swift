// metro-now
// https://github.com/krystxf/metro-now

func isMetro(_ routeName: String, feed: String? = nil) -> Bool {
    guard isPidFeed(feed) else {
        return false
    }

    return ["A", "B", "C"].contains(where: { $0 == routeName })
}

/// The route-name heuristics (A/B/C → metro, S/R/T prefixes → train, etc.)
/// only hold for PID data. Other feeds reuse letters with different meaning,
/// so we gate the parser on the feed. `nil` is treated as PID for legacy
/// call sites (previews, tests) that predate feed plumbing.
func isPidFeed(_ feed: String?) -> Bool {
    guard let feed else {
        return true
    }

    return feed == "PID"
}
