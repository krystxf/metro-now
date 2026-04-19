// @generated
// This file was automatically generated and should not be edited.

import ApolloAPI

nonisolated protocol MetroNowAPI_SelectionSet: ApolloAPI.SelectionSet & ApolloAPI.RootSelectionSet
    where Schema == MetroNowAPI.SchemaMetadata {}

nonisolated protocol MetroNowAPI_InlineFragment: ApolloAPI.SelectionSet & ApolloAPI.InlineFragment
    where Schema == MetroNowAPI.SchemaMetadata {}

nonisolated protocol MetroNowAPI_MutableSelectionSet: ApolloAPI.MutableRootSelectionSet
    where Schema == MetroNowAPI.SchemaMetadata {}

nonisolated protocol MetroNowAPI_MutableInlineFragment: ApolloAPI.MutableSelectionSet & ApolloAPI.InlineFragment
    where Schema == MetroNowAPI.SchemaMetadata {}

extension MetroNowAPI {
    typealias SelectionSet = MetroNowAPI_SelectionSet

    typealias InlineFragment = MetroNowAPI_InlineFragment

    typealias MutableSelectionSet = MetroNowAPI_MutableSelectionSet

    typealias MutableInlineFragment = MetroNowAPI_MutableInlineFragment

    nonisolated enum SchemaMetadata: ApolloAPI.SchemaMetadata {
        static let configuration: any ApolloAPI.SchemaConfiguration.Type = SchemaConfiguration.self

        private static let objectTypeMap: [String: ApolloAPI.Object] = [
            "Departure": MetroNowAPI.Objects.Departure,
            "DepartureTime": MetroNowAPI.Objects.DepartureTime,
            "Infotext": MetroNowAPI.Objects.Infotext,
            "InfotextRelatedStop": MetroNowAPI.Objects.InfotextRelatedStop,
            "Platform": MetroNowAPI.Objects.Platform,
            "Query": MetroNowAPI.Objects.Query,
            "Route": MetroNowAPI.Objects.Route,
            "RouteDirection": MetroNowAPI.Objects.RouteDirection,
            "RouteShape": MetroNowAPI.Objects.RouteShape,
            "Stop": MetroNowAPI.Objects.Stop,
            "StopEntrance": MetroNowAPI.Objects.StopEntrance,
        ]

        static func objectType(forTypename typename: String) -> ApolloAPI.Object? {
            objectTypeMap[typename]
        }
    }

    nonisolated enum Objects {}
    nonisolated enum Interfaces {}
    nonisolated enum Unions {}
}
