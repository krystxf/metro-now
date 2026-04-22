// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension MetroNowAPI {
    nonisolated struct SearchOtherStopsQuery: GraphQLQuery {
        static let operationName: String = "SearchOtherStops"
        static let operationDocument: ApolloAPI.OperationDocument = .init(
            definition: .init(
                #"query SearchOtherStops($query: String!, $limit: Int!, $latitude: Float, $longitude: Float) { searchStops( query: $query limit: $limit latitude: $latitude longitude: $longitude ) { __typename id name avgLatitude avgLongitude entrances { __typename id name latitude longitude } platforms { __typename id latitude longitude name code direction isMetro routes { __typename id name color feed vehicleType isNight } } } }"#
            )
        )

        var query: String
        var limit: Int32
        var latitude: GraphQLNullable<Double>
        var longitude: GraphQLNullable<Double>

        init(
            query: String,
            limit: Int32,
            latitude: GraphQLNullable<Double>,
            longitude: GraphQLNullable<Double>
        ) {
            self.query = query
            self.limit = limit
            self.latitude = latitude
            self.longitude = longitude
        }

        @_spi(Unsafe) public var __variables: Variables? {
            [
                "query": query,
                "limit": limit,
                "latitude": latitude,
                "longitude": longitude,
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
                    .field("searchStops", [SearchStop].self, arguments: [
                        "query": .variable("query"),
                        "limit": .variable("limit"),
                        "latitude": .variable("latitude"),
                        "longitude": .variable("longitude"),
                    ]),
                ]
            }

            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] {
                [
                    SearchOtherStopsQuery.Data.self,
                ]
            }

            var searchStops: [SearchStop] {
                __data["searchStops"]
            }

            /// SearchStop
            ///
            /// Parent Type: `Stop`
            nonisolated struct SearchStop: MetroNowAPI.SelectionSet {
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
                        .field("entrances", [Entrance].self),
                        .field("platforms", [Platform].self),
                    ]
                }

                static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] {
                    [
                        SearchOtherStopsQuery.Data.SearchStop.self,
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

                var entrances: [Entrance] {
                    __data["entrances"]
                }

                var platforms: [Platform] {
                    __data["platforms"]
                }

                /// SearchStop.Entrance
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
                            SearchOtherStopsQuery.Data.SearchStop.Entrance.self,
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

                /// SearchStop.Platform
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
                            SearchOtherStopsQuery.Data.SearchStop.Platform.self,
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

                    /// SearchStop.Platform.Route
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
                                SearchOtherStopsQuery.Data.SearchStop.Platform.Route.self,
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
