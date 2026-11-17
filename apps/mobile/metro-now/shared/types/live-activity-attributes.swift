// metro-now
// https://github.com/krystxf/metro-now

#if canImport(ActivityKit) && !targetEnvironment(macCatalyst)
    import ActivityKit
    import Foundation

    /// Shared attributes for the departures Live Activity.
    /// Lives in `shared/` so both the main app target (which calls `Activity.request` / `update`)
    /// and the `widgetsExtension` target (which renders the UI) reference the same type.
    @available(iOS 16.2, *)
    struct DeparturesActivityAttributes: ActivityAttributes {
        struct ContentState: Codable, Hashable {
            var nextHeadsign: String
            var nextDeparture: Date
            var followingHeadsign: String?
            var followingDeparture: Date?
            var delaySeconds: Int
            var isRealtime: Bool
            var updatedAt: Date
        }

        // Static attributes — identify which line/direction this activity tracks.
        var stopName: String
        var stopId: String? // preferred fetch scope (matches main-app query)
        var platformId: String // fallback fetch scope + display context
        var platformName: String
        var platformCode: String?
        var routeId: String? // backend route id (may be a backendRouteId variant)
        var routeName: String // human label: "A", "B", "C", "22", …
        var headsign: String // primary direction filter — mirrors the row the user long-pressed
        var startedAt: Date
    }
#endif
