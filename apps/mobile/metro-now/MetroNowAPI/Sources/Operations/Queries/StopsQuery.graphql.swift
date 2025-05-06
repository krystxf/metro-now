// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public class StopsQuery: GraphQLQuery {
    public static let operationName: String = "Stops"
    public static let operationDocument: ApolloAPI.OperationDocument = .init(
        definition: .init(
            #"query Stops { stops { __typename id avgLatitude avgLongitude name platforms { __typename id name latitude longitude code } } }"#
        ))

    public init() {}

    public struct Data: MetroNowAPI.SelectionSet {
        public let __data: DataDict
        public init(_dataDict: DataDict) { __data = _dataDict }

        public static var __parentType: ApolloAPI.ParentType { MetroNowAPI.Objects.Query }
        public static var __selections: [ApolloAPI.Selection] { [
            .field("stops", [Stop].self),
        ] }

        public var stops: [Stop] { __data["stops"] }

        /// Stop
        ///
        /// Parent Type: `Stop`
        public struct Stop: MetroNowAPI.SelectionSet {
            public let __data: DataDict
            public init(_dataDict: DataDict) { __data = _dataDict }

            public static var __parentType: ApolloAPI.ParentType { MetroNowAPI.Objects.Stop }
            public static var __selections: [ApolloAPI.Selection] { [
                .field("__typename", String.self),
                .field("id", MetroNowAPI.ID.self),
                .field("avgLatitude", Double.self),
                .field("avgLongitude", Double.self),
                .field("name", String.self),
                .field("platforms", [Platform].self),
            ] }

            public var id: MetroNowAPI.ID { __data["id"] }
            public var avgLatitude: Double { __data["avgLatitude"] }
            public var avgLongitude: Double { __data["avgLongitude"] }
            public var name: String { __data["name"] }
            public var platforms: [Platform] { __data["platforms"] }

            /// Stop.Platform
            ///
            /// Parent Type: `Platform`
            public struct Platform: MetroNowAPI.SelectionSet {
                public let __data: DataDict
                public init(_dataDict: DataDict) { __data = _dataDict }

                public static var __parentType: ApolloAPI.ParentType { MetroNowAPI.Objects.Platform }
                public static var __selections: [ApolloAPI.Selection] { [
                    .field("__typename", String.self),
                    .field("id", MetroNowAPI.ID.self),
                    .field("name", String.self),
                    .field("latitude", Double.self),
                    .field("longitude", Double.self),
                    .field("code", String?.self),
                ] }

                public var id: MetroNowAPI.ID { __data["id"] }
                public var name: String { __data["name"] }
                public var latitude: Double { __data["latitude"] }
                public var longitude: Double { __data["longitude"] }
                public var code: String? { __data["code"] }
            }
        }
    }
}
