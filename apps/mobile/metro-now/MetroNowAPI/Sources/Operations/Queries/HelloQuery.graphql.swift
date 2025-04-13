// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public class HelloQuery: GraphQLQuery {
    public static let operationName: String = "Hello"
    public static let operationDocument: ApolloAPI.OperationDocument = .init(
        definition: .init(
            #"query Hello { hello }"#
        ))

    public init() {}

    public struct Data: MetroNowAPI.SelectionSet {
        public let __data: DataDict
        public init(_dataDict: DataDict) { __data = _dataDict }

        public static var __parentType: ApolloAPI.ParentType { MetroNowAPI.Objects.Query }
        public static var __selections: [ApolloAPI.Selection] { [
            .field("hello", String.self),
        ] }

        public var hello: String { __data["hello"] }
    }
}
