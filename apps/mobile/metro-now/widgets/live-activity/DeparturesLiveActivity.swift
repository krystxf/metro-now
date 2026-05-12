// metro-now
// https://github.com/krystxf/metro-now

#if canImport(ActivityKit) && !targetEnvironment(macCatalyst)
    import ActivityKit
    import SwiftUI
    import WidgetKit

    @available(iOS 16.2, *)
    struct DeparturesLiveActivity: Widget {
        var body: some WidgetConfiguration {
            ActivityConfiguration(for: DeparturesActivityAttributes.self) { context in
                // Lock Screen / Banner view
                DeparturesLiveActivityLockScreenView(
                    attributes: context.attributes,
                    state: context.state
                )
                .activityBackgroundTint(Color.black.opacity(0.2))
                .activitySystemActionForegroundColor(.primary)
            } dynamicIsland: { context in
                DynamicIsland {
                    DynamicIslandExpandedRegion(.leading) {
                        HStack(spacing: 8) {
                            RouteNameIconView(
                                label: context.attributes.routeName,
                                background: getRouteColor(context.attributes.routeName)
                            )
                            Text(context.state.nextHeadsign)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .lineLimit(1)
                        }
                    }
                    DynamicIslandExpandedRegion(.trailing) {
                        Text(
                            timerInterval: Date.now ... max(context.state.nextDeparture, Date.now),
                            countsDown: true
                        )
                        .font(.title2)
                        .fontWeight(.bold)
                        .monospacedDigit()
                        .frame(maxWidth: 80, alignment: .trailing)
                    }
                    DynamicIslandExpandedRegion(.bottom) {
                        if let followingDeparture = context.state.followingDeparture {
                            HStack {
                                if let followingHeadsign = context.state.followingHeadsign,
                                   followingHeadsign != context.state.nextHeadsign
                                {
                                    Text(followingHeadsign)
                                }
                                Spacer()
                                Text(followingDeparture, style: .relative)
                                    .monospacedDigit()
                            }
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        }
                    }
                } compactLeading: {
                    RouteNameIconView(
                        label: context.attributes.routeName,
                        background: getRouteColor(context.attributes.routeName),
                        compact: true
                    )
                } compactTrailing: {
                    Text(
                        timerInterval: Date.now ... max(context.state.nextDeparture, Date.now),
                        countsDown: true
                    )
                    .monospacedDigit()
                    .frame(maxWidth: 50)
                } minimal: {
                    RouteNameIconView(
                        label: context.attributes.routeName,
                        background: getRouteColor(context.attributes.routeName),
                        compact: true
                    )
                }
                .keylineTint(getRouteColor(context.attributes.routeName))
            }
        }
    }

    @available(iOS 16.2, *)
    struct DeparturesLiveActivityLockScreenView: View {
        let attributes: DeparturesActivityAttributes
        let state: DeparturesActivityAttributes.ContentState

        var body: some View {
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .top, spacing: 8) {
                    RouteNameIconView(
                        label: attributes.routeName,
                        background: getRouteColor(attributes.routeName)
                    )

                    VStack(alignment: .trailing, spacing: 4) {
                        HStack {
                            Text(state.nextHeadsign)
                                .lineLimit(1)
                            Spacer()
                            Text(
                                timerInterval: Date.now ... max(state.nextDeparture, Date.now),
                                countsDown: true
                            )
                            .monospacedDigit()
                            .frame(minWidth: 60, alignment: .trailing)
                        }
                        .font(.headline)
                        .fontWeight(.semibold)

                        if let followingDeparture = state.followingDeparture {
                            HStack {
                                if let followingHeadsign = state.followingHeadsign,
                                   followingHeadsign != state.nextHeadsign
                                {
                                    Text(followingHeadsign)
                                        .lineLimit(1)
                                }
                                Spacer()
                                Text(followingDeparture, style: .relative)
                                    .monospacedDigit()
                            }
                            .foregroundStyle(.secondary)
                            .font(.footnote)
                            .fontWeight(.semibold)
                        }
                    }
                }

                HStack {
                    Text(attributes.stopName)
                        .lineLimit(1)
                    if let code = attributes.platformCode, !code.isEmpty {
                        Text("· \(code)")
                    }
                    Spacer()
                    if !state.isRealtime {
                        Text("scheduled")
                    }
                }
                .font(.caption2)
                .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
    }
#endif
