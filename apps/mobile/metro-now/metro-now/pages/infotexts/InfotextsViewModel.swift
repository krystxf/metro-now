// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

private struct InfotextsQueryData: Decodable {
    let infotexts: [ApiInfotext]
}

private struct EmptyGraphQLVariables: Encodable {}

private let INFOTEXTS_QUERY = """
query Infotexts {
  infotexts {
    id
    text
    textEn
    priority
    displayType
    validFrom
    validTo
    relatedStops {
      name
    }
  }
}
"""

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

struct ApiInfotextRelatedStop: Decodable {
    let name: String
}

struct ApiInfotext: Decodable {
    let id: String
    let text: String
    let textEn: String?
    let priority: String
    let displayType: String
    let validFrom: String?
    let validTo: String?
    let relatedStops: [ApiInfotextRelatedStop]

    var relatedStopNames: [String] {
        relatedStops.reduce(into: [String]()) { result, stop in
            guard !stop.name.isEmpty, !result.contains(stop.name) else {
                return
            }

            result.append(stop.name)
        }
    }

    var severity: InfotextSeverity {
        InfotextSeverity(rawValue: priority) ?? .normal
    }
}

class InfotextsViewModel: ObservableObject {
    @Published var infotexts: [ApiInfotext] = []
    @Published var isLoading = true

    init() {
        Task(priority: .high) {
            await loadInfotexts()
        }
    }

    @MainActor
    private func loadInfotexts() async {
        do {
            let result = try await fetchGraphQLData(
                query: INFOTEXTS_QUERY,
                variables: EmptyGraphQLVariables(),
                ofType: InfotextsQueryData.self
            )
            infotexts = result.infotexts
            print("Fetched \(result.infotexts.count) infotexts")
        } catch {
            print("Failed to fetch infotexts: \(error)")
        }

        isLoading = false
    }
}
