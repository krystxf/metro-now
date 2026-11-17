// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

enum InfotextSeverity: String {
    case low = "LOW"
    case normal = "NORMAL"
    case high = "HIGH"

    var title: String {
        switch self {
        case .low:
            "Minor"
        case .normal:
            "Warning"
        case .high:
            "Critical"
        }
    }

    var iconName: String {
        switch self {
        case .low:
            "checkmark.circle.fill"
        case .normal:
            "exclamationmark.circle.fill"
        case .high:
            "exclamationmark.triangle.fill"
        }
    }

    var color: Color {
        switch self {
        case .low:
            .green
        case .normal:
            .orange
        case .high:
            .red
        }
    }

    var sortOrder: Int {
        switch self {
        case .high: 0
        case .normal: 1
        case .low: 2
        }
    }
}

extension ApiInfotext {
    var severity: InfotextSeverity {
        InfotextSeverity(rawValue: priority) ?? .normal
    }
}

private let INFOTEXTS_CACHE_KEY = "infotexts_v1"
private let INFOTEXTS_CACHE_MAX_AGE: TimeInterval = 6 * 60 * 60

@MainActor
final class InfotextsViewModel: ObservableObject {
    typealias FetchInfotexts = @Sendable () async throws -> [ApiInfotext]
    typealias LoadCachedInfotexts = @Sendable () -> [ApiInfotext]?
    typealias SaveCachedInfotexts = @Sendable ([ApiInfotext]) -> Void

    @Published var infotexts: [ApiInfotext] = []
    @Published var isLoading = true

    private let fetchInfotexts: FetchInfotexts
    private let loadCachedInfotexts: LoadCachedInfotexts
    private let loadStaleCachedInfotexts: LoadCachedInfotexts
    private let saveCachedInfotexts: SaveCachedInfotexts

    init(
        fetchInfotexts: @escaping FetchInfotexts = defaultFetchInfotexts,
        loadCachedInfotexts: @escaping LoadCachedInfotexts = defaultLoadCachedInfotexts,
        loadStaleCachedInfotexts: @escaping LoadCachedInfotexts = defaultLoadStaleCachedInfotexts,
        saveCachedInfotexts: @escaping SaveCachedInfotexts = defaultSaveCachedInfotexts
    ) {
        self.fetchInfotexts = fetchInfotexts
        self.loadCachedInfotexts = loadCachedInfotexts
        self.loadStaleCachedInfotexts = loadStaleCachedInfotexts
        self.saveCachedInfotexts = saveCachedInfotexts

        if let cached = loadCachedInfotexts() {
            infotexts = cached
            isLoading = false
        } else if let stale = loadStaleCachedInfotexts() {
            infotexts = stale
        }

        Task(priority: .high) {
            await loadInfotexts()
        }
    }

    private func loadInfotexts() async {
        do {
            let fetched = try await fetchInfotexts()
            infotexts = fetched
            saveCachedInfotexts(fetched)
            print("Fetched \(infotexts.count) infotexts")
        } catch {
            // Keep whatever we showed from cache (fresh or stale).
            print("Failed to fetch infotexts: \(error)")
        }

        isLoading = false
    }

    private static func defaultLoadCachedInfotexts() -> [ApiInfotext]? {
        DiskCache.load(
            key: INFOTEXTS_CACHE_KEY,
            maxAge: INFOTEXTS_CACHE_MAX_AGE,
            as: [ApiInfotext].self
        )
    }

    private static func defaultLoadStaleCachedInfotexts() -> [ApiInfotext]? {
        DiskCache.loadStale(
            key: INFOTEXTS_CACHE_KEY,
            as: [ApiInfotext].self
        )?.data
    }

    private static func defaultSaveCachedInfotexts(_ infotexts: [ApiInfotext]) {
        DiskCache.save(infotexts, key: INFOTEXTS_CACHE_KEY)
    }

    private static func defaultFetchInfotexts() async throws -> [ApiInfotext] {
        let result = try await fetchGraphQLQuery(
            MetroNowAPI.InfotextsQuery()
        )

        return result.infotexts.map { infotext in
            ApiInfotext(
                id: infotext.id,
                text: infotext.text,
                textEn: infotext.textEn,
                priority: infotext.priority.rawValue,
                displayType: infotext.displayType,
                validFrom: infotext.validFrom,
                validTo: infotext.validTo,
                relatedStops: infotext.relatedStops.map { relatedStop in
                    ApiInfotextRelatedStop(name: relatedStop.name)
                }
            )
        }
    }
}
