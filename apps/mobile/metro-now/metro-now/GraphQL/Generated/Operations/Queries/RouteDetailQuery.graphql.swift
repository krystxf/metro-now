// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension MetroNowAPI {
  nonisolated struct RouteDetailQuery: GraphQLQuery {
    static let operationName: String = "RouteDetail"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query RouteDetail($id: ID!) { route(id: $id) { __typename id name color isNight isSubstitute vehicleType feed directions { __typename id platforms { __typename id name latitude longitude isMetro code direction } } shapes { __typename id directionId tripCount geoJson } } }"#
      ))

    public var id: ID

    public init(id: ID) {
      self.id = id
    }

    @_spi(Unsafe) public var __variables: Variables? { ["id": id] }

    nonisolated struct Data: MetroNowAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { MetroNowAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("route", Route?.self, arguments: ["id": .variable("id")]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        RouteDetailQuery.Data.self
      ] }

      var route: Route? { __data["route"] }

      /// Route
      ///
      /// Parent Type: `Route`
      nonisolated struct Route: MetroNowAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { MetroNowAPI.Objects.Route }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("id", MetroNowAPI.ID.self),
          .field("name", String?.self),
          .field("color", String?.self),
          .field("isNight", Bool.self),
          .field("isSubstitute", Bool.self),
          .field("vehicleType", GraphQLEnum<MetroNowAPI.VehicleType>.self),
          .field("feed", GraphQLEnum<MetroNowAPI.Feed>.self),
          .field("directions", [Direction].self),
          .field("shapes", [Shape].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          RouteDetailQuery.Data.Route.self
        ] }

        var id: MetroNowAPI.ID { __data["id"] }
        var name: String? { __data["name"] }
        var color: String? { __data["color"] }
        var isNight: Bool { __data["isNight"] }
        var isSubstitute: Bool { __data["isSubstitute"] }
        var vehicleType: GraphQLEnum<MetroNowAPI.VehicleType> { __data["vehicleType"] }
        var feed: GraphQLEnum<MetroNowAPI.Feed> { __data["feed"] }
        var directions: [Direction] { __data["directions"] }
        var shapes: [Shape] { __data["shapes"] }

        /// Route.Direction
        ///
        /// Parent Type: `RouteDirection`
        nonisolated struct Direction: MetroNowAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { MetroNowAPI.Objects.RouteDirection }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("id", MetroNowAPI.ID.self),
            .field("platforms", [Platform].self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            RouteDetailQuery.Data.Route.Direction.self
          ] }

          var id: MetroNowAPI.ID { __data["id"] }
          var platforms: [Platform] { __data["platforms"] }

          /// Route.Direction.Platform
          ///
          /// Parent Type: `Platform`
          nonisolated struct Platform: MetroNowAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { MetroNowAPI.Objects.Platform }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("id", MetroNowAPI.ID.self),
              .field("name", String.self),
              .field("latitude", Double.self),
              .field("longitude", Double.self),
              .field("isMetro", Bool.self),
              .field("code", String?.self),
              .field("direction", String?.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              RouteDetailQuery.Data.Route.Direction.Platform.self
            ] }

            var id: MetroNowAPI.ID { __data["id"] }
            var name: String { __data["name"] }
            var latitude: Double { __data["latitude"] }
            var longitude: Double { __data["longitude"] }
            var isMetro: Bool { __data["isMetro"] }
            var code: String? { __data["code"] }
            var direction: String? { __data["direction"] }
          }
        }

        /// Route.Shape
        ///
        /// Parent Type: `RouteShape`
        nonisolated struct Shape: MetroNowAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { MetroNowAPI.Objects.RouteShape }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("id", MetroNowAPI.ID.self),
            .field("directionId", MetroNowAPI.ID.self),
            .field("tripCount", Int.self),
            .field("geoJson", String.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            RouteDetailQuery.Data.Route.Shape.self
          ] }

          var id: MetroNowAPI.ID { __data["id"] }
          var directionId: MetroNowAPI.ID { __data["directionId"] }
          var tripCount: Int { __data["tripCount"] }
          var geoJson: String { __data["geoJson"] }
        }
      }
    }
  }

}