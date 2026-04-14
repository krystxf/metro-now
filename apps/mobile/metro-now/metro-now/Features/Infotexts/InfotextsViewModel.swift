// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI
import Translation

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

struct InfotextEnglishText: Equatable {
    let text: String
    let isAutomatic: Bool
}

private extension String {
    var nonEmptyText: String? {
        let value = trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}

private extension String? {
    var nonEmptyText: String? {
        self?.nonEmptyText
    }
}

@MainActor
final class InfotextsViewModel: ObservableObject {
    @Published var infotexts: [ApiInfotext] = []
    @Published var isLoading = true
    @Published private(set) var automaticEnglishTextsById: [String: String] = [:]
    @Published private(set) var pendingAutomaticTranslationIDs: [String] = []
    @Published private(set) var isTranslatingAutomaticEnglishText = false

    init() {
        Task(priority: .high) {
            await loadInfotexts()
        }
    }

    func englishText(for infotext: ApiInfotext) -> InfotextEnglishText? {
        if let providedEnglishText = infotext.textEn.nonEmptyText {
            return InfotextEnglishText(
                text: providedEnglishText,
                isAutomatic: false
            )
        }

        if let automaticEnglishText = automaticEnglishTextsById[infotext.id].nonEmptyText {
            return InfotextEnglishText(
                text: automaticEnglishText,
                isAutomatic: true
            )
        }

        return nil
    }

    func translateMissingInfotexts(using session: TranslationSession) async {
        let pendingIDs = Set(pendingAutomaticTranslationIDs)
        let infotextsToTranslate = infotexts.filter { pendingIDs.contains($0.id) }

        guard !infotextsToTranslate.isEmpty, !isTranslatingAutomaticEnglishText else {
            return
        }

        isTranslatingAutomaticEnglishText = true

        defer {
            isTranslatingAutomaticEnglishText = false
        }

        let translationRequests = infotextsToTranslate.map { infotext in
            TranslationSession.Request(
                sourceText: infotext.text,
                clientIdentifier: infotext.id
            )
        }

        do {
            try await session.prepareTranslation()

            let responses = try await session.translations(from: translationRequests)
            let translatedTextsById = responses.reduce(into: [String: String]()) {
                result,
                response in
                guard let infotextID = response.clientIdentifier,
                      let translatedText = response.targetText.nonEmptyText
                else {
                    return
                }

                result[infotextID] = translatedText
            }

            automaticEnglishTextsById.merge(
                translatedTextsById,
                uniquingKeysWith: { _, newValue in newValue }
            )

            let unresolvedIDs = pendingIDs.subtracting(translatedTextsById.keys)
            if !unresolvedIDs.isEmpty {
                print(
                    "Automatic translation did not return text for \(unresolvedIDs.count) infotexts"
                )
            }

            refreshPendingAutomaticTranslationIDs()
            print("Translated \(translatedTextsById.count) infotexts automatically")
        } catch {
            print("Failed to translate infotexts automatically: \(error)")
        }
    }

    private func loadInfotexts() async {
        do {
            let result = try await fetchGraphQLQuery(
                MetroNowAPI.InfotextsQuery()
            )
            automaticEnglishTextsById = [:]
            infotexts = result.infotexts.map { infotext in
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
            refreshPendingAutomaticTranslationIDs()
            print("Fetched \(infotexts.count) infotexts")
        } catch {
            print("Failed to fetch infotexts: \(error)")
        }

        isLoading = false
    }

    private func refreshPendingAutomaticTranslationIDs() {
        pendingAutomaticTranslationIDs = infotexts
            .filter { infotext in
                infotext.textEn.nonEmptyText == nil
                    && automaticEnglishTextsById[infotext.id].nonEmptyText == nil
            }
            .map(\.id)
            .sorted()
    }
}
