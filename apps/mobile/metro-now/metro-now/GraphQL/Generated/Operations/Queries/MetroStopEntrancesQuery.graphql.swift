// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension MetroNowAPI {
    nonisolated struct MetroStopEntrancesQuery: GraphQLQuery {
        static let operationName: String = "MetroStopEntrances"
        static let operationDocument: ApolloAPI.OperationDocument = .init(
            operationIdentifier: "c100b5c8d73861ba0bcbab7a12b0ce50b7a37312e941402de1b6e232f9269972",
            definition: .init(
                #"query MetroStopEntrances($ids: [ID!]) { stops(ids: $ids) { __typename id entrances { __typename id name latitude longitude } } }"#
            )
        )

        var ids: GraphQLNullable<[ID]>

        init(ids: GraphQLNullable<[ID]>) {
            self.ids = ids
        }

        @_spi(Unsafe) public var __variables: Variables? {
            ["ids": ids]
        }

        nonisolated struct Data: MetroNowAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) {
                __data = _dataDict
            }

            static var __parentType: any ApolloAPI.ParentType {
                MetroNowAPI.Objects.Query
            }

            static var __selections: [ApolloAPI.Selection] {
                [
                    .field("stops", [Stop].self, arguments: ["ids": .variable("ids")]),
                ]
            }

            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] {
                [
                    MetroStopEntrancesQuery.Data.self,
                ]
            }

            var stops: [Stop] {
                __data["stops"]
            }

            /// Stop
            ///
            /// Parent Type: `Stop`
            nonisolated struct Stop: MetroNowAPI.SelectionSet {
                let __data: DataDict
                init(_dataDict: DataDict) {
                    __data = _dataDict
                }

                static var __parentType: any ApolloAPI.ParentType {
                    MetroNowAPI.Objects.Stop
                }

                static var __selections: [ApolloAPI.Selection] {
                    [
                        .field("__typename", String.self),
                        .field("id", MetroNowAPI.ID.self),
                        .field("entrances", [Entrance].self),
                    ]
                }

                static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] {
                    [
                        MetroStopEntrancesQuery.Data.Stop.self,
                    ]
                }

                var id: MetroNowAPI.ID {
                    __data["id"]
                }

                var entrances: [Entrance] {
                    __data["entrances"]
                }

                /// Stop.Entrance
                ///
                /// Parent Type: `StopEntrance`
                nonisolated struct Entrance: MetroNowAPI.SelectionSet {
                    let __data: DataDict
                    init(_dataDict: DataDict) {
                        __data = _dataDict
                    }

                    static var __parentType: any ApolloAPI.ParentType {
                        MetroNowAPI.Objects.StopEntrance
                    }

                    static var __selections: [ApolloAPI.Selection] {
                        [
                            .field("__typename", String.self),
                            .field("id", MetroNowAPI.ID.self),
                            .field("name", String.self),
                            .field("latitude", Double.self),
                            .field("longitude", Double.self),
                        ]
                    }

                    static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] {
                        [
                            MetroStopEntrancesQuery.Data.Stop.Entrance.self,
                        ]
                    }

                    var id: MetroNowAPI.ID {
                        __data["id"]
                    }

                    var name: String {
                        __data["name"]
                    }

                    var latitude: Double {
                        __data["latitude"]
                    }

                    var longitude: Double {
                        __data["longitude"]
                    }
                }
            }
        }
    }
}
