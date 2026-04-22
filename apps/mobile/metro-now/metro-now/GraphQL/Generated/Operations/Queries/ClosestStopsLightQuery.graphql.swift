// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension MetroNowAPI {
  nonisolated struct ClosestStopsLightQuery: GraphQLQuery {
    static let operationName: String = "ClosestStopsLight"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query ClosestStopsLight($latitude: Float!, $longitude: Float!, $limit: Int) { closestStops(latitude: $latitude, longitude: $longitude, limit: $limit) { __typename id name avgLatitude avgLongitude distance } }"#
      ))

    public var latitude: Double
    public var longitude: Double
    public var limit: GraphQLNullable<Int32>

    public init(
      latitude: Double,
      longitude: Double,
      limit: GraphQLNullable<Int32>
    ) {
      self.latitude = latitude
      self.longitude = longitude
      self.limit = limit
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "latitude": latitude,
      "longitude": longitude,
      "limit": limit
    ] }

    nonisolated struct Data: MetroNowAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { MetroNowAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("closestStops", [ClosestStop].self, arguments: [
          "latitude": .variable("latitude"),
          "longitude": .variable("longitude"),
          "limit": .variable("limit")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        ClosestStopsLightQuery.Data.self
      ] }

      var closestStops: [ClosestStop] { __data["closestStops"] }

      /// ClosestStop
      ///
      /// Parent Type: `StopWithDistance`
      nonisolated struct ClosestStop: MetroNowAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { MetroNowAPI.Objects.StopWithDistance }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("id", MetroNowAPI.ID.self),
          .field("name", String.self),
          .field("avgLatitude", Double.self),
          .field("avgLongitude", Double.self),
          .field("distance", Double.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          ClosestStopsLightQuery.Data.ClosestStop.self
        ] }

        var id: MetroNowAPI.ID { __data["id"] }
        var name: String { __data["name"] }
        var avgLatitude: Double { __data["avgLatitude"] }
        var avgLongitude: Double { __data["avgLongitude"] }
        var distance: Double { __data["distance"] }
      }
    }
  }

}