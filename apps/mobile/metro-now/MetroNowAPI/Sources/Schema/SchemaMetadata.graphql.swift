// @generated
// This file was automatically generated and should not be edited.

import ApolloAPI

public typealias ID = String

public protocol SelectionSet: ApolloAPI.SelectionSet & ApolloAPI.RootSelectionSet
    where Schema == MetroNowAPI.SchemaMetadata {}

public protocol InlineFragment: ApolloAPI.SelectionSet & ApolloAPI.InlineFragment
    where Schema == MetroNowAPI.SchemaMetadata {}

public protocol MutableSelectionSet: ApolloAPI.MutableRootSelectionSet
    where Schema == MetroNowAPI.SchemaMetadata {}

public protocol MutableInlineFragment: ApolloAPI.MutableSelectionSet & ApolloAPI.InlineFragment
    where Schema == MetroNowAPI.SchemaMetadata {}

public enum SchemaMetadata: ApolloAPI.SchemaMetadata {
    public static let configuration: ApolloAPI.SchemaConfiguration.Type = SchemaConfiguration.self

    public static func objectType(forTypename typename: String) -> Object? {
        switch typename {
        case "Query": MetroNowAPI.Objects.Query
        case "Infotext": MetroNowAPI.Objects.Infotext
        case "Platform": MetroNowAPI.Objects.Platform
        case "Stop": MetroNowAPI.Objects.Stop
        default: nil
        }
    }
}

public enum Objects {}
public enum Interfaces {}
public enum Unions {}
