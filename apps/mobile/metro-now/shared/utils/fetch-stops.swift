// metro-now
// https://github.com/krystxf/metro-now

import Foundation

private let STOPS_CACHE_MAX_AGE: TimeInterval = 24 * 60 * 60

/// Page size for paginated stop fetching. Backend struggles when asked to
/// hydrate all ~20k stops in a single response, so we chunk requests.
private let STOPS_PAGE_SIZE = 1000

private func stopsCacheKey(metroOnly: Bool) -> String {
    metroOnly ? "stops_all_metro_only_v1" : "stops_all_v1"
}

private let stopsGraphQLOperation = """
query AllStopsLight($limit: Int, $offset: Int) {
  stops(limit: $limit, offset: $offset) {
    id
    name
    avgLatitude
    avgLongitude
    isMetro
    platforms {
      id
      latitude
      longitude
      name
      code
      direction
      isMetro
      routes {
        id
        name
        color
      }
    }
  }
}
"""

private struct GQLStopsResponse: Decodable {
    struct DataBox: Decodable {
        let stops: [GQLStopRow]
    }

    let data: DataBox?
}

private struct GQLStopRow: Decodable {
    let id: String
    let name: String
    let avgLatitude: Double
    let avgLongitude: Double
    let isMetro: Bool
    let platforms: [GQLPlatformRow]
}

private struct GQLPlatformRow: Decodable {
    let id: String
    let latitude: Double
    let longitude: Double
    let name: String
    let code: String?
    let direction: String?
    let isMetro: Bool
    let routes: [GQLRouteRow]
}

private struct GQLRouteRow: Decodable {
    let id: String
    let name: String
    let color: String?
}

private func mapStops(_ rows: [GQLStopRow]) -> [ApiStop] {
    rows.map { row in
        ApiStop(
            id: row.id,
            name: row.name,
            avgLatitude: row.avgLatitude,
            avgLongitude: row.avgLongitude,
            entrances: [],
            platforms: row.platforms.map { p in
                ApiPlatform(
                    id: p.id,
                    latitude: p.latitude,
                    longitude: p.longitude,
                    name: p.name,
                    code: p.code,
                    direction: p.direction,
                    isMetro: p.isMetro,
                    routes: p.routes.map { r in ApiRoute(id: r.id, name: r.name, color: r.color) }
                )
            }
        )
    }
}

/// Fetches all stops via GraphQL with 24h disk caching and stale fallback on network failure.
/// Intended for widgets and the Watch App — the main app uses Apollo and maintains its own cache.
private func fetchStopsPage(offset: Int) async -> [GQLStopRow]? {
    let body: [String: Any] = [
        "query": stopsGraphQLOperation,
        "variables": [
            "limit": STOPS_PAGE_SIZE,
            "offset": offset,
        ],
    ]

    guard
        let jsonData = try? JSONSerialization.data(withJSONObject: body),
        let url = URL(string: GRAPHQL_URL)
    else {
        return nil
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.httpBody = jsonData
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown",
        forHTTPHeaderField: "X-App-Version"
    )
    request.setValue(
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "unknown",
        forHTTPHeaderField: "X-App-Build"
    )
    request.setValue("ios", forHTTPHeaderField: "X-App-Platform")

    guard
        let (data, response) = try? await URLSession.shared.data(for: request),
        let http = response as? HTTPURLResponse,
        (200 ... 299).contains(http.statusCode),
        let decoded = try? JSONDecoder().decode(GQLStopsResponse.self, from: data),
        let rows = decoded.data?.stops
    else {
        return nil
    }

    return rows
}

func fetchStopsWithCache(metroOnly: Bool) async -> [ApiStop]? {
    let key = stopsCacheKey(metroOnly: metroOnly)

    if let cached = DiskCache.load(key: key, maxAge: STOPS_CACHE_MAX_AGE, as: [ApiStop].self) {
        return cached
    }

    var allRows: [GQLStopRow] = []
    var offset = 0
    while true {
        guard let page = await fetchStopsPage(offset: offset) else {
            return DiskCache.loadStale(key: key, as: [ApiStop].self)?.data
        }
        allRows.append(contentsOf: page)
        if page.count < STOPS_PAGE_SIZE {
            break
        }
        offset += STOPS_PAGE_SIZE
    }

    var stops = mapStops(allRows)
    if metroOnly {
        stops = stops.filter { $0.platforms.contains(where: \.isMetro) }
    }

    DiskCache.save(stops, key: key)
    return stops
}
