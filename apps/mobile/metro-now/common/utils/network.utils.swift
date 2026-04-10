// metro-now
// https://github.com/krystxf/metro-now

import Alamofire
import Foundation

private struct GraphQLRequestBody<Variables: Encodable>: Encodable {
    let query: String
    let variables: Variables
}

private struct GraphQLResponse<Data: Decodable>: Decodable {
    let data: Data?
    let errors: [GraphQLErrorPayload]?
}

private struct GraphQLErrorPayload: Decodable {
    let message: String
}

func fetchData<T: Decodable>(_ req: DataRequest, ofType _: T.Type) async throws -> T {
    try await withCheckedThrowingContinuation { continuation in
        req.responseDecodable(of: T.self) { response in
            switch response.result {
            case let .success(data):
                continuation.resume(returning: data)
            case let .failure(error):
                continuation.resume(throwing: error)
            }
        }
    }
}

func fetchGraphQLData<T: Decodable>(
    query: String,
    variables: some Encodable,
    ofType _: T.Type
) async throws -> T {
    let request = apiSession.request(
        GRAPHQL_URL,
        method: .post,
        parameters: GraphQLRequestBody(query: query, variables: variables),
        encoder: JSONParameterEncoder.default
    )
    .validate()

    let response: GraphQLResponse<T> = try await fetchData(
        request,
        ofType: GraphQLResponse<T>.self
    )

    if let data = response.data {
        return data
    }

    let message = response.errors?.map(\.message).joined(separator: "\n")
        ?? "Missing GraphQL response data"
    throw NSError(
        domain: "GraphQL",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: message]
    )
}
