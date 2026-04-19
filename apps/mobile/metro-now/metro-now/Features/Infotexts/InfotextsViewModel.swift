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
    @Published var infotexts: [ApiInfotext] = []
    @Published var isLoading = true

    init() {
        if let cached = DiskCache.load(
            key: INFOTEXTS_CACHE_KEY,
            maxAge: INFOTEXTS_CACHE_MAX_AGE,
            as: [ApiInfotext].self
        ) {
            infotexts = cached
            isLoading = false
        } else if let stale = DiskCache.loadStale(
            key: INFOTEXTS_CACHE_KEY,
            as: [ApiInfotext].self
        ) {
            infotexts = stale.data
        }

        Task(priority: .high) {
            await loadInfotexts()
        }
    }

    private func loadInfotexts() async {
        do {
            let result = try await fetchGraphQLQuery(
                MetroNowAPI.InfotextsQuery()
            )
            let fetched = result.infotexts.map { infotext in
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
            infotexts = fetched
            DiskCache.save(fetched, key: INFOTEXTS_CACHE_KEY)
            print("Fetched \(infotexts.count) infotexts")
        } catch {
            // Keep whatever we showed from cache (fresh or stale).
            print("Failed to fetch infotexts: \(error)")
        }

        isLoading = false
    }
}
