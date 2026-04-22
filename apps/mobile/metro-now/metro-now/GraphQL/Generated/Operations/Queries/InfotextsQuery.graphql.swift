// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension MetroNowAPI {
  nonisolated struct InfotextsQuery: GraphQLQuery {
    static let operationName: String = "Infotexts"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query Infotexts { infotexts { __typename id text textEn priority displayType validFrom validTo relatedStops { __typename name } } }"#
      ))

    public init() {}

    nonisolated struct Data: MetroNowAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { MetroNowAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("infotexts", [Infotext].self),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        InfotextsQuery.Data.self
      ] }

      var infotexts: [Infotext] { __data["infotexts"] }

      /// Infotext
      ///
      /// Parent Type: `Infotext`
      nonisolated struct Infotext: MetroNowAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { MetroNowAPI.Objects.Infotext }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("id", MetroNowAPI.ID.self),
          .field("text", String.self),
          .field("textEn", String?.self),
          .field("priority", GraphQLEnum<MetroNowAPI.InfotextPriority>.self),
          .field("displayType", String.self),
          .field("validFrom", MetroNowAPI.ISODateTime?.self),
          .field("validTo", MetroNowAPI.ISODateTime?.self),
          .field("relatedStops", [RelatedStop].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          InfotextsQuery.Data.Infotext.self
        ] }

        var id: MetroNowAPI.ID { __data["id"] }
        var text: String { __data["text"] }
        var textEn: String? { __data["textEn"] }
        var priority: GraphQLEnum<MetroNowAPI.InfotextPriority> { __data["priority"] }
        var displayType: String { __data["displayType"] }
        var validFrom: MetroNowAPI.ISODateTime? { __data["validFrom"] }
        var validTo: MetroNowAPI.ISODateTime? { __data["validTo"] }
        var relatedStops: [RelatedStop] { __data["relatedStops"] }

        /// Infotext.RelatedStop
        ///
        /// Parent Type: `InfotextRelatedStop`
        nonisolated struct RelatedStop: MetroNowAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { MetroNowAPI.Objects.InfotextRelatedStop }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("name", String.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            InfotextsQuery.Data.Infotext.RelatedStop.self
          ] }

          var name: String { __data["name"] }
        }
      }
    }
  }

}