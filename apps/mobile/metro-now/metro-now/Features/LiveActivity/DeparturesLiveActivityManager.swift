// metro-now
// https://github.com/krystxf/metro-now

#if !targetEnvironment(macCatalyst)
    import ActivityKit
    import Foundation

    /// Owns the lifecycle of `DeparturesActivityAttributes` Live Activities:
    /// start (single-activity invariant), periodic local refresh while foregrounded,
    /// auto-end after 30 minutes. Uses initial row data for instant accurate start,
    /// then re-queries the backend every few seconds while the app is in the foreground.
    @available(iOS 16.2, *)
    @MainActor
    final class DeparturesLiveActivityManager {
        static let shared = DeparturesLiveActivityManager()

        private let activityDuration: TimeInterval = 30 * 60
        /// Mirrors the main app's `REFETCH_INTERVAL` in `ClosestStopPageViewModel` so the
        /// Live Activity can't drift behind what the user sees inside the app.
        private let refreshInterval: TimeInterval = 5

        private var refreshTask: Task<Void, Never>?

        private init() {}

        // MARK: - Public API

        /// Starts a new Live Activity for a given (line, direction) at a given stop/platform,
        /// using the row's data as the initial state so the very first frame is accurate.
        func start(
            stopName: String,
            stopId: String?,
            platformId: String,
            platformName: String,
            platformCode: String?,
            routeId: String?,
            routeName: String,
            headsign: String,
            initialDeparture: Date,
            initialNextHeadsign: String?,
            initialNextDeparture: Date?,
            initialDelaySeconds: Int,
            initialIsRealtime: Bool
        ) async {
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                return
            }

            await endAll()

            let now = Date()
            let attributes = DeparturesActivityAttributes(
                stopName: stopName,
                stopId: stopId,
                platformId: platformId,
                platformName: platformName,
                platformCode: platformCode,
                routeId: routeId,
                routeName: routeName,
                headsign: headsign,
                startedAt: now
            )

            let initialState = DeparturesActivityAttributes.ContentState(
                nextHeadsign: headsign,
                nextDeparture: initialDeparture,
                followingHeadsign: initialNextHeadsign,
                followingDeparture: initialNextDeparture,
                delaySeconds: initialDelaySeconds,
                isRealtime: initialIsRealtime,
                updatedAt: now
            )

            let staleDate = attributes.startedAt.addingTimeInterval(activityDuration)

            do {
                _ = try Activity.request(
                    attributes: attributes,
                    content: ActivityContent(
                        state: initialState,
                        staleDate: staleDate,
                        relevanceScore: 1.0
                    ),
                    pushType: nil
                )
                startRefreshLoop()
                // Kick off an immediate refresh so we pick up any delta between
                // the row's cached data and what the server currently returns.
                Task { [weak self] in await self?.refreshAll() }
            } catch {
                // ActivityKit throws if the user disabled Live Activities or the app
                // exceeds per-app limits. Nothing actionable for the user here.
            }
        }

        /// Ends every running activity for this ActivityAttributes type, immediately.
        func endAll() async {
            for activity in Activity<DeparturesActivityAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            stopRefreshLoop()
        }

        // MARK: - Scene phase hooks (called from metro_nowApp)

        func onEnterForeground() {
            guard !Activity<DeparturesActivityAttributes>.activities.isEmpty else { return }
            Task { [weak self] in await self?.refreshAll() }
            startRefreshLoop()
        }

        func onEnterBackground() {
            stopRefreshLoop()
        }

        // MARK: - Refresh loop

        private func startRefreshLoop() {
            stopRefreshLoop()
            let interval = refreshInterval
            refreshTask = Task { [weak self] in
                while !Task.isCancelled {
                    try? await Task.sleep(nanoseconds: UInt64(interval * Double(NSEC_PER_SEC)))
                    if Task.isCancelled { break }
                    await self?.refreshAll()
                }
            }
        }

        private func stopRefreshLoop() {
            refreshTask?.cancel()
            refreshTask = nil
        }

        private func refreshAll() async {
            let activities = Activity<DeparturesActivityAttributes>.activities
            if activities.isEmpty {
                stopRefreshLoop()
                return
            }

            let now = Date()

            for activity in activities {
                let expiry = activity.attributes.startedAt.addingTimeInterval(activityDuration)
                if now >= expiry {
                    await activity.end(nil, dismissalPolicy: .immediate)
                    continue
                }

                guard let newState = await fetchContentState(for: activity.attributes) else {
                    // Preserve the last known state if the fetch failed — the widget
                    // keeps ticking its countdown locally.
                    continue
                }

                await activity.update(
                    ActivityContent(
                        state: newState,
                        staleDate: expiry,
                        relevanceScore: 1.0
                    )
                )
            }

            if Activity<DeparturesActivityAttributes>.activities.isEmpty {
                stopRefreshLoop()
            }
        }

        // MARK: - Data

        private func fetchContentState(
            for attributes: DeparturesActivityAttributes
        ) async -> DeparturesActivityAttributes.ContentState? {
            let stopIds: [String]
            let platformIds: [String]
            if let stopId = attributes.stopId {
                // Same scope as ClosestStopPageViewModel.fetchAndApplyDepartures — fetch the
                // whole stop so we don't miss trains that materialise at sibling platforms.
                stopIds = [stopId]
                platformIds = []
            } else {
                stopIds = []
                platformIds = [attributes.platformId]
            }

            let departures: [ApiDeparture]
            do {
                departures = try await fetchDeparturesGraphQL(
                    stopIds: stopIds,
                    platformIds: platformIds,
                    limit: 30,
                    metroOnly: nil,
                    minutesBefore: 1,
                    minutesAfter: 60
                )
            } catch {
                return nil
            }

            if departures.isEmpty {
                return nil
            }

            let routeId = attributes.routeId
            let routeName = attributes.routeName
            let headsign = attributes.headsign

            // Primary filter: exact (route, headsign) — mirrors buildMetroDepartureRows'
            // grouping key so the Live Activity shows the same row the user long-pressed.
            let headsignMatches = departures.filter { departure in
                guard routeMatches(departure: departure, routeId: routeId, routeName: routeName) else {
                    return false
                }
                return departure.headsign
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                    .caseInsensitiveCompare(headsign.trimmingCharacters(in: .whitespacesAndNewlines))
                    == .orderedSame
            }

            let candidates: [ApiDeparture] = if !headsignMatches.isEmpty {
                headsignMatches
            } else {
                // Fallback: at least filter to the line so we don't freeze with stale data
                // if the route's final-stop headsign changed server-side mid-activity.
                departures.filter { departure in
                    routeMatches(departure: departure, routeId: routeId, routeName: routeName)
                }
            }

            let sorted = candidates.sorted { $0.departure.predicted < $1.departure.predicted }

            guard let next = sorted.first else {
                return nil
            }
            let following = sorted.dropFirst().first

            return DeparturesActivityAttributes.ContentState(
                nextHeadsign: next.headsign.isEmpty ? headsign : next.headsign,
                nextDeparture: next.departure.predicted,
                followingHeadsign: following?.headsign,
                followingDeparture: following?.departure.predicted,
                delaySeconds: next.delay,
                isRealtime: next.isRealtime ?? false,
                updatedAt: Date()
            )
        }

        private func routeMatches(
            departure: ApiDeparture,
            routeId: String?,
            routeName: String
        ) -> Bool {
            if let routeId, let departureRouteId = departure.routeId, !routeId.isEmpty {
                if departureRouteId == routeId { return true }
                // `previewRouteId` may be a backendRouteId ("L<id>") derived from the
                // platform's route list; match that form too.
                if departureRouteId == "L\(routeId)" { return true }
                if routeId == "L\(departureRouteId)" { return true }
            }
            return departure.route.caseInsensitiveCompare(routeName) == .orderedSame
        }
    }
#endif
