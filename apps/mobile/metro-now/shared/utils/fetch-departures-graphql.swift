// metro-now
// https://github.com/krystxf/metro-now

import Foundation

/// GraphQL departures fetch for targets that do not bundle Apollo-generated operations (Watch, widgets).
private let departuresGraphQLOperation = """
query Departures($stopIds: [ID!], $platformIds: [ID!], $limit: Int, $metroOnly: Boolean, $minutesBefore: Int, $minutesAfter: Int) {
  departures(stopIds: $stopIds, platformIds: $platformIds, limit: $limit, metroOnly: $metroOnly, minutesBefore: $minutesBefore, minutesAfter: $minutesAfter) {
    id
    delay
    headsign
    isRealtime
    platformCode
    departureTime {
      predicted
      scheduled
    }
    platform {
      id
    }
    route {
      id
      name
      color
    }
  }
}
"""

private struct GQLDeparturesResponse: Decodable {
    struct DataBox: Decodable {
        let departures: [GQLDepartureRow]
    }

    let data: DataBox?
}

private struct GQLDepartureRow: Decodable {
    let id: String?
    let delay: Int?
    let headsign: String?
    let isRealtime: Bool
    let platformCode: String?
    let departureTime: GQLDepartureTimeRow
    let platform: GQLPlatformRow
    let route: GQLRouteRow?
}

private struct GQLDepartureTimeRow: Decodable {
    let predicted: String
    let scheduled: String
}

private struct GQLPlatformRow: Decodable {
    let id: String
}

private struct GQLRouteRow: Decodable {
    let id: String
    let name: String?
    let color: String?
}

private func graphQLRequestHeaders() -> [String: String] {
    [
        "Content-Type": "application/json",
        "X-App-Version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown",
        "X-App-Build": Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "unknown",
        "X-App-Platform": "ios",
    ]
}

/// Fetches departures via GraphQL POST. At least one of `stopIds` or `platformIds` must be non-empty.
func fetchDeparturesGraphQL(
    stopIds: [String],
    platformIds: [String],
    limit: Int,
    metroOnly: Bool?,
    minutesBefore: Int,
    minutesAfter: Int
) async throws -> [ApiDeparture] {
    guard !stopIds.isEmpty || !platformIds.isEmpty else {
        return []
    }

    var variables: [String: Any] = [
        "limit": limit,
        "minutesBefore": minutesBefore,
        "minutesAfter": minutesAfter,
    ]
    variables["stopIds"] = stopIds
    variables["platformIds"] = platformIds
    if let metroOnly {
        variables["metroOnly"] = metroOnly
    }

    let body: [String: Any] = [
        "query": departuresGraphQLOperation,
        "variables": variables,
    ]

    let jsonData = try JSONSerialization.data(withJSONObject: body)

    guard let url = URL(string: GRAPHQL_URL) else {
        throw URLError(.badURL)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.httpBody = jsonData
    graphQLRequestHeaders().forEach { request.setValue($1, forHTTPHeaderField: $0) }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let http = response as? HTTPURLResponse, (200 ... 299).contains(http.statusCode) else {
        throw URLError(.badServerResponse)
    }

    let decoded = try JSONDecoder().decode(GQLDeparturesResponse.self, from: data)
    let rows = decoded.data?.departures ?? []

    return rows.compactMap { row in
        guard
            let predicted = parseBackendISO8601(row.departureTime.predicted),
            let scheduled = parseBackendISO8601(row.departureTime.scheduled)
        else {
            return nil
        }

        return ApiDeparture(
            id: row.id,
            platformId: row.platform.id,
            platformCode: row.platformCode,
            headsign: row.headsign ?? "",
            departure: ApiDepartureDate(
                predicted: predicted,
                scheduled: scheduled
            ),
            delay: row.delay ?? 0,
            route: row.route?.name ?? "",
            routeId: row.route?.id,
            routeColor: row.route?.color,
            isRealtime: row.isRealtime
        )
    }
}
