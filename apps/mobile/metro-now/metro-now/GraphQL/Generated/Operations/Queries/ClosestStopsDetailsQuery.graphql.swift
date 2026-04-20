// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension MetroNowAPI {
    nonisolated struct ClosestStopsDetailsQuery: GraphQLQuery {
        static let operationName: String = "ClosestStopsDetails"
        static let operationDocument: ApolloAPI.OperationDocument = .init(
            definition: .init(
                #"query ClosestStopsDetails($ids: [ID!]) { stops(ids: $ids) { __typename id name avgLatitude avgLongitude platforms { __typename id latitude longitude name code direction isMetro routes { __typename id name color } } } }"#
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
                    ClosestStopsDetailsQuery.Data.self,
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
                        .field("name", String.self),
                        .field("avgLatitude", Double.self),
                        .field("avgLongitude", Double.self),
                        .field("platforms", [Platform].self),
                    ]
                }

                static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] {
                    [
                        ClosestStopsDetailsQuery.Data.Stop.self,
                    ]
                }

                var id: MetroNowAPI.ID {
                    __data["id"]
                }

                var name: String {
                    __data["name"]
                }

                var avgLatitude: Double {
                    __data["avgLatitude"]
                }

                var avgLongitude: Double {
                    __data["avgLongitude"]
                }

                var platforms: [Platform] {
                    __data["platforms"]
                }

                /// Stop.Platform
                ///
                /// Parent Type: `Platform`
                nonisolated struct Platform: MetroNowAPI.SelectionSet {
                    let __data: DataDict
                    init(_dataDict: DataDict) {
                        __data = _dataDict
                    }

                    static var __parentType: any ApolloAPI.ParentType {
                        MetroNowAPI.Objects.Platform
                    }

                    static var __selections: [ApolloAPI.Selection] {
                        [
                            .field("__typename", String.self),
                            .field("id", MetroNowAPI.ID.self),
                            .field("latitude", Double.self),
                            .field("longitude", Double.self),
                            .field("name", String.self),
                            .field("code", String?.self),
                            .field("direction", String?.self),
                            .field("isMetro", Bool.self),
                            .field("routes", [Route].self),
                        ]
                    }

                    static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] {
                        [
                            ClosestStopsDetailsQuery.Data.Stop.Platform.self,
                        ]
                    }

                    var id: MetroNowAPI.ID {
                        __data["id"]
                    }

                    var latitude: Double {
                        __data["latitude"]
                    }

                    var longitude: Double {
                        __data["longitude"]
                    }

                    var name: String {
                        __data["name"]
                    }

                    var code: String? {
                        __data["code"]
                    }

                    var direction: String? {
                        __data["direction"]
                    }

                    var isMetro: Bool {
                        __data["isMetro"]
                    }

                    var routes: [Route] {
                        __data["routes"]
                    }

                    /// Stop.Platform.Route
                    ///
                    /// Parent Type: `Route`
                    nonisolated struct Route: MetroNowAPI.SelectionSet {
                        let __data: DataDict
                        init(_dataDict: DataDict) {
                            __data = _dataDict
                        }

                        static var __parentType: any ApolloAPI.ParentType {
                            MetroNowAPI.Objects.Route
                        }

                        static var __selections: [ApolloAPI.Selection] {
                            [
                                .field("__typename", String.self),
                                .field("id", MetroNowAPI.ID.self),
                                .field("name", String?.self),
                                .field("color", String?.self),
                            ]
                        }

                        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] {
                            [
                                ClosestStopsDetailsQuery.Data.Stop.Platform.Route.self,
                            ]
                        }

                        var id: MetroNowAPI.ID {
                            __data["id"]
                        }

                        var name: String? {
                            __data["name"]
                        }

                        var color: String? {
                            __data["color"]
                        }
                    }
                }
            }
        }
    }
}
