// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct InfotextsItem: View {
    let infotext: ApiInfotext
    var showsRelatedStops: Bool = true

    private static func parseISO8601(_ string: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: string) { return date }
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: string)
    }

    private var formattedDateRange: String? {
        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .medium
        displayFormatter.timeStyle = .short

        let from = infotext.validFrom.flatMap { Self.parseISO8601($0) }
        let to = infotext.validTo.flatMap { Self.parseISO8601($0) }

        if let from, let to {
            return "\(displayFormatter.string(from: from)) – \(displayFormatter.string(from: to))"
        } else if let from {
            return String.localizedStringWithFormat(
                NSLocalizedString(
                    "From %@",
                    comment: "Prefix for the start date of a traffic alert"
                ),
                displayFormatter.string(from: from)
            )
        } else if let to {
            return String.localizedStringWithFormat(
                NSLocalizedString(
                    "Until %@",
                    comment: "Prefix for the end date of a traffic alert"
                ),
                displayFormatter.string(from: to)
            )
        }

        return nil
    }

    var body: some View {
        Section {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    Image(systemName: infotext.severity.iconName)
                        .foregroundStyle(infotext.severity.color)
                        .font(.system(size: 16, weight: .semibold))

                    Text(infotext.severity.title)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(infotext.severity.color)
                }

                Text(infotext.text)
                    .font(.callout)

                if showsRelatedStops, !infotext.relatedStopNames.isEmpty {
                    Divider()

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Related stops")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        Text(infotext.relatedStopNames.joined(separator: ", "))
                            .font(.caption)
                    }
                }

                if let dateRange = formattedDateRange {
                    Divider()
                    Label(dateRange, systemImage: "calendar")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}

#Preview {
    List {
        InfotextsItem(
            infotext: PreviewData.infotext
        )
    }
}
