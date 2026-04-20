// metro-now
// https://github.com/krystxf/metro-now

import Apollo
import ApolloAPI
import ApolloSQLite
import Foundation

private func appRequestHeaders() -> [String: String] {
    [
        "X-App-Version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown",
        "X-App-Build": Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "unknown",
        "X-App-Platform": "ios",
    ]
}

private func makeApolloCache() -> any NormalizedCache {
    guard let cachesDir = FileManager.default.urls(
        for: .cachesDirectory,
        in: .userDomainMask
    ).first else {
        return InMemoryNormalizedCache()
    }
    let fileURL = cachesDir.appendingPathComponent("apollo_cache.sqlite")
    do {
        return try SQLiteNormalizedCache(fileURL: fileURL)
    } catch {
        print("Failed to init SQLiteNormalizedCache at \(fileURL): \(error). Falling back to in-memory.")
        return InMemoryNormalizedCache()
    }
}

private let apolloClient: ApolloClient = {
    let store = ApolloStore(cache: makeApolloCache())
    let configuration = URLSessionConfiguration.default
    configuration.urlCache = nil
    configuration.requestCachePolicy = .reloadIgnoringLocalCacheData

    print("[GraphQL] endpoint=\(GRAPHQL_URL)")

    let transport = RequestChainNetworkTransport(
        urlSession: URLSession(configuration: configuration),
        interceptorProvider: DefaultInterceptorProvider.shared,
        store: store,
        endpointURL: URL(string: GRAPHQL_URL)!,
        additionalHeaders: appRequestHeaders()
    )

    return ApolloClient(
        networkTransport: transport,
        store: store
    )
}()

func clearGraphQLCache() async throws {
    try await apolloClient.clearCache()
}

func fetchGraphQLQuery<Query: ApolloAPI.GraphQLQuery>(
    _ query: Query,
    cachePolicy: CachePolicy.Query.SingleResponse = .networkFirst
) async throws -> Query.Data where Query.ResponseFormat == ApolloAPI.SingleResponseFormat {
    let opName = type(of: query).operationName
    let startedAt = Date()
    do {
        print("[GraphQL] \(opName) start cachePolicy=\(String(describing: cachePolicy))")
        let response = try await apolloClient.fetch(
            query: query,
            cachePolicy: cachePolicy
        )

        if let errors = response.errors, !errors.isEmpty {
            print("[GraphQL] \(opName) errors: \(errors.map(\.localizedDescription).joined(separator: "; "))")
        }

        if let data = response.data {
            let elapsedMs = Int(Date().timeIntervalSince(startedAt) * 1000)
            print("[GraphQL] \(opName) success in \(elapsedMs)ms")
            return data
        }

        let message = response.errors?
            .map(\.localizedDescription)
            .joined(separator: "\n")
            ?? "Missing GraphQL response data"
        let elapsedMs = Int(Date().timeIntervalSince(startedAt) * 1000)
        print("[GraphQL] \(opName) no data after \(elapsedMs)ms: \(message)")
        throw NSError(
            domain: "GraphQL",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: message]
        )
    } catch {
        let elapsedMs = Int(Date().timeIntervalSince(startedAt) * 1000)
        print("[GraphQL] \(opName) transport error after \(elapsedMs)ms: \(error.localizedDescription)")
        throw error
    }
}
