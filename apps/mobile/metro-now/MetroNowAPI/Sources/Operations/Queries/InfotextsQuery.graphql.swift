// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public class InfotextsQuery: GraphQLQuery {
    public static let operationName: String = "Infotexts"
    public static let operationDocument: ApolloAPI.OperationDocument = .init(
        definition: .init(
            #"query Infotexts { infotexts { __typename id text textEn priority validFrom validTo relatedPlatforms { __typename code name stop { __typename id name } } } }"#
        ))

    public init() {}

    public struct Data: MetroNowAPI.SelectionSet {
        public let __data: DataDict
        public init(_dataDict: DataDict) { __data = _dataDict }

        public static var __parentType: ApolloAPI.ParentType { MetroNowAPI.Objects.Query }
        public static var __selections: [ApolloAPI.Selection] { [
            .field("infotexts", [Infotext].self),
        ] }

        public var infotexts: [Infotext] { __data["infotexts"] }

        /// Infotext
        ///
        /// Parent Type: `Infotext`
        public struct Infotext: MetroNowAPI.SelectionSet {
            public let __data: DataDict
            public init(_dataDict: DataDict) { __data = _dataDict }

            public static var __parentType: ApolloAPI.ParentType { MetroNowAPI.Objects.Infotext }
            public static var __selections: [ApolloAPI.Selection] { [
                .field("__typename", String.self),
                .field("id", MetroNowAPI.ID.self),
                .field("text", String.self),
                .field("textEn", String?.self),
                .field("priority", GraphQLEnum<MetroNowAPI.InfotextPriority>.self),
                .field("validFrom", MetroNowAPI.ISODateTime?.self),
                .field("validTo", MetroNowAPI.ISODateTime?.self),
                .field("relatedPlatforms", [RelatedPlatform].self),
            ] }

            public var id: MetroNowAPI.ID { __data["id"] }
            public var text: String { __data["text"] }
            public var textEn: String? { __data["textEn"] }
            public var priority: GraphQLEnum<MetroNowAPI.InfotextPriority> { __data["priority"] }
            public var validFrom: MetroNowAPI.ISODateTime? { __data["validFrom"] }
            public var validTo: MetroNowAPI.ISODateTime? { __data["validTo"] }
            public var relatedPlatforms: [RelatedPlatform] { __data["relatedPlatforms"] }

            /// Infotext.RelatedPlatform
            ///
            /// Parent Type: `Platform`
            public struct RelatedPlatform: MetroNowAPI.SelectionSet {
                public let __data: DataDict
                public init(_dataDict: DataDict) { __data = _dataDict }

                public static var __parentType: ApolloAPI.ParentType { MetroNowAPI.Objects.Platform }
                public static var __selections: [ApolloAPI.Selection] { [
                    .field("__typename", String.self),
                    .field("code", String?.self),
                    .field("name", String.self),
                    .field("stop", Stop.self),
                ] }

                public var code: String? { __data["code"] }
                public var name: String { __data["name"] }
                public var stop: Stop { __data["stop"] }

                /// Infotext.RelatedPlatform.Stop
                ///
                /// Parent Type: `Stop`
                public struct Stop: MetroNowAPI.SelectionSet {
                    public let __data: DataDict
                    public init(_dataDict: DataDict) { __data = _dataDict }

                    public static var __parentType: ApolloAPI.ParentType { MetroNowAPI.Objects.Stop }
                    public static var __selections: [ApolloAPI.Selection] { [
                        .field("__typename", String.self),
                        .field("id", MetroNowAPI.ID.self),
                        .field("name", String.self),
                    ] }

                    public var id: MetroNowAPI.ID { __data["id"] }
                    public var name: String { __data["name"] }
                }
            }
        }
    }
}
