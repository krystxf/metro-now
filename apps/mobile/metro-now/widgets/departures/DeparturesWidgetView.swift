// metro-now
// https://github.com/krystxf/metro-now

import AppIntents
import Foundation
import SwiftUI
import WidgetKit

/// Same formatting and `numericText` transition as `CountdownView`. `referenceNow` is `entry.date` from the
/// timeline provider (staggered per-second entries) so the home screen updates without `TimelineView`.
private let widgetUpdatedAgoFormatter: RelativeDateTimeFormatter = {
    let formatter = RelativeDateTimeFormatter()
    formatter.unitsStyle = .abbreviated
    return formatter
}()

private struct WidgetDepartureCountdownText: View {
    let targetDate: Date
    var referenceNow: Date
    var font: Font = .subheadline
    var fontWeight: Font.Weight = .medium
    var useSecondaryColor: Bool = false

    var body: some View {
        countdownText(remaining: targetDate.timeIntervalSince(referenceNow))
    }

    @ViewBuilder
    private func countdownText(remaining: TimeInterval) -> some View {
        let line = Text(getRemainingTime(remaining))
            .font(font)
            .fontWeight(fontWeight)
            .monospacedDigit()
            .contentTransition(.numericText(value: remaining))
            .animation(.default, value: getRemainingTime(remaining))
        if useSecondaryColor {
            line.foregroundStyle(.secondary)
        } else {
            line
        }
    }
}

/// Single-unit age since refresh: "now", "30s ago", "20m ago", "4h ago", "3d ago".
private func updatedAgoString(for date: Date, relativeTo now: Date) -> String {
    if abs(now.timeIntervalSince(date)) < 1 {
        return NSLocalizedString(
            "now",
            comment: "Widget status label when content was just refreshed"
        )
    }

    return widgetUpdatedAgoFormatter.localizedString(for: date, relativeTo: now)
}

struct DeparturesRefreshIntent: AppIntent {
    static var title: LocalizedStringResource = "Refresh Departures"

    func perform() async throws -> some IntentResult {
        WidgetCenter.shared.reloadTimelines(ofKind: "MetroDepartures")
        return .result()
    }
}

/// Increments `spinToken` on tap so `symbolEffect` / rotation can replay (App Intent buttons).
private struct DeparturesRefreshTapButtonStyle: ButtonStyle {
    @Binding var spinToken: Int

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .onChange(of: configuration.isPressed) { _, pressed in
                guard pressed else { return }
                spinToken += 1
            }
    }
}

struct DeparturesWidgetView: View {
    var entry: DeparturesWidgetTimelineProvider.Entry
    @Environment(\.widgetFamily) var widgetFamily
    @State private var refreshSpinToken: Int = 0

    private var maxDepartures: Int {
        switch widgetFamily {
        case .systemLarge: 8
        default: 4
        }
    }

    private var showNextDeparture: Bool {
        widgetFamily == .systemLarge
    }

    var body: some View {
        let now = entry.date
        VStack(alignment: .leading, spacing: 0) {
            headerView(referenceNow: now)

            if entry.departures.isEmpty {
                emptyStateView
            } else {
                departureListView(referenceNow: now)
            }
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .padding(.vertical, 1)
        .padding(.horizontal, 1)
    }

    private func headerView(referenceNow: Date) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text(entry.stopName)
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundStyle(.primary)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)

            HStack(alignment: .top, spacing: 6) {
                Text(updatedAgoString(for: entry.date, relativeTo: referenceNow))
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .multilineTextAlignment(.trailing)
                    .fixedSize(horizontal: true, vertical: false)

                refreshButton
            }
        }
        .padding(.bottom, 1)
    }

    private var refreshButton: some View {
        Button(intent: DeparturesRefreshIntent()) {
            refreshIconImage
        }
        .buttonStyle(DeparturesRefreshTapButtonStyle(spinToken: $refreshSpinToken))
    }

    @ViewBuilder
    private var refreshIconImage: some View {
        if #available(iOS 18.0, *) {
            Image(systemName: "arrow.trianglehead.2.clockwise.rotate.90")
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
                .symbolEffect(.rotate.byLayer, options: .nonRepeating, value: refreshSpinToken)
        } else {
            Image(systemName: "arrow.trianglehead.2.clockwise.rotate.90")
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
                .rotationEffect(.degrees(Double(refreshSpinToken) * 360))
                .animation(.linear(duration: 0.55), value: refreshSpinToken)
        }
    }

    private var emptyStateView: some View {
        Text("No departures")
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 8)
    }

    private func departureListView(referenceNow: Date) -> some View {
        VStack(alignment: .leading, spacing: widgetFamily == .systemLarge ? 6 : 4) {
            ForEach(
                Array(entry.departures.prefix(maxDepartures).enumerated()),
                id: \.offset
            ) { _, departure in
                departureRow(departure, referenceNow: referenceNow)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func departureRow(_ departure: WidgetDepartureGroup, referenceNow: Date) -> some View {
        HStack(alignment: .center, spacing: 8) {
            RouteNameIconView(
                label: departure.routeLabel,
                background: getRouteColor(departure.routeLabel),
                compact: true
            )

            Text(departure.headsign)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .frame(minWidth: 0, maxWidth: .infinity, alignment: .leading)

            VStack(alignment: .trailing, spacing: 0) {
                WidgetDepartureCountdownText(
                    targetDate: departure.departureTime,
                    referenceNow: referenceNow,
                    font: .subheadline,
                    fontWeight: .medium
                )

                if showNextDeparture, let nextTime = departure.nextDepartureTime {
                    WidgetDepartureCountdownText(
                        targetDate: nextTime,
                        referenceNow: referenceNow,
                        font: .caption2,
                        fontWeight: .medium,
                        useSecondaryColor: true
                    )
                }
            }
        }
    }
}

#Preview(as: .systemMedium) {
    DeparturesWidget()
} timeline: {
    DeparturesWidgetTimelineEntry(
        date: .now,
        stopName: "Mustek",
        departures: [
            WidgetDepartureGroup(
                routeLabel: "A",
                headsign: "Depo Hostivar",
                departureTime: .now + 2 * 60,
                nextDepartureTime: .now + 6 * 60
            ),
            WidgetDepartureGroup(
                routeLabel: "B",
                headsign: "Cerny Most",
                departureTime: .now + 4 * 60,
                nextDepartureTime: .now + 8 * 60
            ),
        ]
    )
}
