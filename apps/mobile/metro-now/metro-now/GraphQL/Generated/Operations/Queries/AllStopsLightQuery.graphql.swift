// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension MetroNowAPI {
    nonisolated struct AllStopsLightQuery: GraphQLQuery {
        static let operationName: String = "AllStopsLight"
        static let operationDocument: ApolloAPI.OperationDocument = .init(
            definition: .init(
                #"query AllStopsLight($limit: Int, $offset: Int) { stops(limit: $limit, offset: $offset) { __typename id name avgLatitude avgLongitude platforms { __typename id latitude longitude name code isMetro routes { __typename id name color feed vehicleType isNight } } } }"#
            )
        )

        var limit: GraphQLNullable<Int32>
        var offset: GraphQLNullable<Int32>

        init(
            limit: GraphQLNullable<Int32>,
            offset: GraphQLNullable<Int32>
        ) {
            self.limit = limit
            self.offset = offset
        }

        @_spi(Unsafe) public var __variables: Variables? {
            [
                "limit": limit,
                "offset": offset,
            ]
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
                    .field("stops", [Stop].self, arguments: [
                        "limit": .variable("limit"),
                        "offset": .variable("offset"),
                    ]),
                ]
            }

            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] {
                [
                    AllStopsLightQuery.Data.self,
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
                        AllStopsLightQuery.Data.Stop.self,
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
                            .field("isMetro", Bool.self),
                            .field("routes", [Route].self),
                        ]
                    }

                    static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] {
                        [
                            AllStopsLightQuery.Data.Stop.Platform.self,
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
                                .field("feed", GraphQLEnum<MetroNowAPI.Feed>.self),
                                .field("vehicleType", GraphQLEnum<MetroNowAPI.VehicleType>.self),
                                .field("isNight", Bool.self),
                            ]
                        }

                        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] {
                            [
                                AllStopsLightQuery.Data.Stop.Platform.Route.self,
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

                        var feed: GraphQLEnum<MetroNowAPI.Feed> {
                            __data["feed"]
                        }

                        var vehicleType: GraphQLEnum<MetroNowAPI.VehicleType> {
                            __data["vehicleType"]
                        }

                        var isNight: Bool {
                            __data["isNight"]
                        }
                    }
                }
            }
        }
    }
}
