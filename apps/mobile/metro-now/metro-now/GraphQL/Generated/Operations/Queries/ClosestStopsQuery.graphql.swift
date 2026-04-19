// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension MetroNowAPI {
    nonisolated struct ClosestStopsQuery: GraphQLQuery {
        static let operationName: String = "ClosestStops"
        static let operationDocument: ApolloAPI.OperationDocument = .init(
            definition: .init(
                #"query ClosestStops($latitude: Float!, $longitude: Float!, $limit: Int) { closestStops(latitude: $latitude, longitude: $longitude, limit: $limit) { __typename id name avgLatitude avgLongitude distance entrances { __typename id name latitude longitude } platforms { __typename id latitude longitude name code isMetro routes { __typename id name } } } }"#
            )
        )

        var latitude: Double
        var longitude: Double
        var limit: GraphQLNullable<Int32>

        init(
            latitude: Double,
            longitude: Double,
            limit: GraphQLNullable<Int32> = nil
        ) {
            self.latitude = latitude
            self.longitude = longitude
            self.limit = limit
        }

        @_spi(Unsafe) public var __variables: Variables? {
            [
                "latitude": latitude,
                "longitude": longitude,
                "limit": limit,
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
                    .field("closestStops", [ClosestStop].self, arguments: [
                        "latitude": .variable("latitude"),
                        "longitude": .variable("longitude"),
                        "limit": .variable("limit"),
                    ]),
                ]
            }

            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] {
                [
                    ClosestStopsQuery.Data.self,
                ]
            }

            var closestStops: [ClosestStop] {
                __data["closestStops"]
            }

            /// ClosestStop
            ///
            /// Parent Type: `StopWithDistance`
            nonisolated struct ClosestStop: MetroNowAPI.SelectionSet {
                let __data: DataDict
                init(_dataDict: DataDict) {
                    __data = _dataDict
                }

                static var __parentType: any ApolloAPI.ParentType {
                    MetroNowAPI.Objects.StopWithDistance
                }

                static var __selections: [ApolloAPI.Selection] {
                    [
                        .field("__typename", String.self),
                        .field("id", MetroNowAPI.ID.self),
                        .field("name", String.self),
                        .field("avgLatitude", Double.self),
                        .field("avgLongitude", Double.self),
                        .field("distance", Double.self),
                        .field("entrances", [Entrance].self),
                        .field("platforms", [Platform].self),
                    ]
                }

                static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] {
                    [
                        ClosestStopsQuery.Data.ClosestStop.self,
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

                var distance: Double {
                    __data["distance"]
                }

                var entrances: [Entrance] {
                    __data["entrances"]
                }

                var platforms: [Platform] {
                    __data["platforms"]
                }

                /// ClosestStop.Entrance
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
                            ClosestStopsQuery.Data.ClosestStop.Entrance.self,
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

                /// ClosestStop.Platform
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
                            ClosestStopsQuery.Data.ClosestStop.Platform.self,
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

                    /// ClosestStop.Platform.Route
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
                            ]
                        }

                        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] {
                            [
                                ClosestStopsQuery.Data.ClosestStop.Platform.Route.self,
                            ]
                        }

                        var id: MetroNowAPI.ID {
                            __data["id"]
                        }

                        var name: String? {
                            __data["name"]
                        }
                    }
                }
            }
        }
    }
}
