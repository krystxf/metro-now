// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct AllDeparturesRequest: Identifiable {
    let platform: ApiPlatform
    let routeFilter: RouteFilter?

    struct RouteFilter {
        let routeId: String
        let headsign: String
    }

    var id: String {
        "\(platform.id)::\(routeFilter?.routeId ?? "")::\(routeFilter?.headsign ?? "")"
    }
}

struct AllDeparturesSheetView: View {
    let request: AllDeparturesRequest

    @State private var fetchedDepartures: [ApiDeparture]?
    @State private var errorMessage: String?

    private let displayLimit = 10

    private var filteredDepartures: [ApiDeparture] {
        guard let fetchedDepartures else { return [] }
        let normalizedHeadsign = request.routeFilter?.headsign
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return fetchedDepartures
            .filter { dep in
                if let filter = request.routeFilter {
                    if dep.routeId != filter.routeId { return false }
                    if let normalizedHeadsign,
                       dep.headsign
                       .trimmingCharacters(in: .whitespacesAndNewlines)
                       != normalizedHeadsign
                    {
                        return false
                    }
                }
                return true
            }
            .sorted { $0.departure.predicted < $1.departure.predicted }
            .prefix(displayLimit)
            .map { $0 }
    }

    var body: some View {
        NavigationStack {
            Group {
                if let errorMessage {
                    ContentUnavailableView(
                        "Couldn't load departures",
                        systemImage: "exclamationmark.triangle",
                        description: Text(errorMessage)
                    )
                } else if fetchedDepartures == nil {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if filteredDepartures.isEmpty {
                    ContentUnavailableView(
                        "No upcoming departures",
                        systemImage: "tram.fill"
                    )
                } else {
                    List(
                        Array(filteredDepartures.enumerated()),
                        id: \.offset
                    ) { _, dep in
                        HStack(alignment: .center, spacing: 12) {
                            RouteNameIconView(
                                label: dep.route,
                                background: getRouteColor(
                                    routeName: dep.route,
                                    routeId: dep.routeId,
                                    availableRoutes: request.platform.routes
                                )
                            )
                            VStack(alignment: .leading, spacing: 2) {
                                Text(dep.headsign)
                                    .fontWeight(.semibold)
                                Text(dep.departure.predicted.formatted(
                                    date: .omitted,
                                    time: .shortened
                                ))
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                            }
                            Spacer()
                            CountdownView(targetDate: dep.departure.predicted)
                                .fontWeight(.semibold)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle(getPlatformLabel(request.platform))
            .navigationBarTitleDisplayMode(.inline)
        }
        .task(id: request.id) {
            await load()
        }
    }

    private func load() async {
        do {
            let response = try await fetchGraphQLQuery(
                MetroNowAPI.DeparturesQuery(
                    stopIds: .none,
                    platformIds: .some([request.platform.id]),
                    limit: .some(50),
                    metroOnly: .none,
                    minutesBefore: .some(1),
                    minutesAfter: .some(Int32(12 * 60))
                )
            )
            let mapped = response.departures.compactMap {
                mapGraphQLDeparture($0)
            }
            await MainActor.run {
                fetchedDepartures = mapped
                errorMessage = nil
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                fetchedDepartures = []
            }
        }
    }
}
