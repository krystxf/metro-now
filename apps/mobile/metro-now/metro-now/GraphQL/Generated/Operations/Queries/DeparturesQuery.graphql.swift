// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension MetroNowAPI {
    nonisolated struct DeparturesQuery: GraphQLQuery {
        static let operationName: String = "Departures"
        static let operationDocument: ApolloAPI.OperationDocument = .init(
            operationIdentifier: "e19ea94f90ad88f9ca7a1724e7c34128ae290910ae4ebcbc29f1cb6b04fe3173",
            definition: .init(
                #"query Departures($stopIds: [ID!], $platformIds: [ID!], $limit: Int, $metroOnly: Boolean, $minutesBefore: Int, $minutesAfter: Int) { departures( stopIds: $stopIds platformIds: $platformIds limit: $limit metroOnly: $metroOnly minutesBefore: $minutesBefore minutesAfter: $minutesAfter ) { __typename id delay headsign isRealtime platformCode departureTime { __typename predicted scheduled } platform { __typename id } route { __typename id name color feed vehicleType isNight } } }"#
            )
        )

        var stopIds: GraphQLNullable<[ID]>
        var platformIds: GraphQLNullable<[ID]>
        var limit: GraphQLNullable<Int32>
        var metroOnly: GraphQLNullable<Bool>
        var minutesBefore: GraphQLNullable<Int32>
        var minutesAfter: GraphQLNullable<Int32>

        init(
            stopIds: GraphQLNullable<[ID]>,
            platformIds: GraphQLNullable<[ID]>,
            limit: GraphQLNullable<Int32>,
            metroOnly: GraphQLNullable<Bool>,
            minutesBefore: GraphQLNullable<Int32>,
            minutesAfter: GraphQLNullable<Int32>
        ) {
            self.stopIds = stopIds
            self.platformIds = platformIds
            self.limit = limit
            self.metroOnly = metroOnly
            self.minutesBefore = minutesBefore
            self.minutesAfter = minutesAfter
        }

        @_spi(Unsafe) public var __variables: Variables? {
            [
                "stopIds": stopIds,
                "platformIds": platformIds,
                "limit": limit,
                "metroOnly": metroOnly,
                "minutesBefore": minutesBefore,
                "minutesAfter": minutesAfter,
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
                    .field("departures", [Departure].self, arguments: [
                        "stopIds": .variable("stopIds"),
                        "platformIds": .variable("platformIds"),
                        "limit": .variable("limit"),
                        "metroOnly": .variable("metroOnly"),
                        "minutesBefore": .variable("minutesBefore"),
                        "minutesAfter": .variable("minutesAfter"),
                    ]),
                ]
            }

            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] {
                [
                    DeparturesQuery.Data.self,
                ]
            }

            var departures: [Departure] {
                __data["departures"]
            }

            /// Departure
            ///
            /// Parent Type: `Departure`
            nonisolated struct Departure: MetroNowAPI.SelectionSet {
                let __data: DataDict
                init(_dataDict: DataDict) {
                    __data = _dataDict
                }

                static var __parentType: any ApolloAPI.ParentType {
                    MetroNowAPI.Objects.Departure
                }

                static var __selections: [ApolloAPI.Selection] {
                    [
                        .field("__typename", String.self),
                        .field("id", MetroNowAPI.ID?.self),
                        .field("delay", Int?.self),
                        .field("headsign", String?.self),
                        .field("isRealtime", Bool.self),
                        .field("platformCode", String?.self),
                        .field("departureTime", DepartureTime.self),
                        .field("platform", Platform.self),
                        .field("route", Route?.self),
                    ]
                }

                static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] {
                    [
                        DeparturesQuery.Data.Departure.self,
                    ]
                }

                var id: MetroNowAPI.ID? {
                    __data["id"]
                }

                var delay: Int? {
                    __data["delay"]
                }

                var headsign: String? {
                    __data["headsign"]
                }

                var isRealtime: Bool {
                    __data["isRealtime"]
                }

                var platformCode: String? {
                    __data["platformCode"]
                }

                var departureTime: DepartureTime {
                    __data["departureTime"]
                }

                var platform: Platform {
                    __data["platform"]
                }

                var route: Route? {
                    __data["route"]
                }

                /// Departure.DepartureTime
                ///
                /// Parent Type: `DepartureTime`
                nonisolated struct DepartureTime: MetroNowAPI.SelectionSet {
                    let __data: DataDict
                    init(_dataDict: DataDict) {
                        __data = _dataDict
                    }

                    static var __parentType: any ApolloAPI.ParentType {
                        MetroNowAPI.Objects.DepartureTime
                    }

                    static var __selections: [ApolloAPI.Selection] {
                        [
                            .field("__typename", String.self),
                            .field("predicted", MetroNowAPI.ISODateTime.self),
                            .field("scheduled", MetroNowAPI.ISODateTime.self),
                        ]
                    }

                    static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] {
                        [
                            DeparturesQuery.Data.Departure.DepartureTime.self,
                        ]
                    }

                    var predicted: MetroNowAPI.ISODateTime {
                        __data["predicted"]
                    }

                    var scheduled: MetroNowAPI.ISODateTime {
                        __data["scheduled"]
                    }
                }

                /// Departure.Platform
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
                        ]
                    }

                    static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] {
                        [
                            DeparturesQuery.Data.Departure.Platform.self,
                        ]
                    }

                    var id: MetroNowAPI.ID {
                        __data["id"]
                    }
                }

                /// Departure.Route
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
                            DeparturesQuery.Data.Departure.Route.self,
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
