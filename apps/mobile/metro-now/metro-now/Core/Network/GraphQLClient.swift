// metro-now
// https://github.com/krystxf/metro-now

import Apollo
import ApolloAPI
import Foundation

private func appRequestHeaders() -> [String: String] {
    [
        "X-App-Version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown",
        "X-App-Build": Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "unknown",
        "X-App-Platform": "ios",
    ]
}

private let apolloClient: ApolloClient = {
    let store = ApolloStore(cache: InMemoryNormalizedCache())
    let configuration = URLSessionConfiguration.default
    configuration.urlCache = nil
    configuration.requestCachePolicy = .reloadIgnoringLocalCacheData

    let transport = RequestChainNetworkTransport(
        urlSession: URLSession(configuration: configuration),
        interceptorProvider: DefaultInterceptorProvider.shared,
        store: store,
        endpointURL: URL(string: GRAPHQL_URL)!,
        additionalHeaders: appRequestHeaders()
    )

    return ApolloClient(
        networkTransport: transport,
        store: store,
        defaultRequestConfiguration: RequestConfiguration(
            writeResultsToCache: false
        )
    )
}()

func fetchGraphQLQuery<Query: ApolloAPI.GraphQLQuery>(
    _ query: Query,
    cachePolicy: CachePolicy.Query.SingleResponse = .networkOnly
) async throws -> Query.Data where Query.ResponseFormat == ApolloAPI.SingleResponseFormat {
    let response = try await apolloClient.fetch(
        query: query,
        cachePolicy: cachePolicy
    )

    if let data = response.data {
        return data
    }

    let message = response.errors?
        .map(\.localizedDescription)
        .joined(separator: "\n")
        ?? "Missing GraphQL response data"
    throw NSError(
        domain: "GraphQL",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: message]
    )
}
