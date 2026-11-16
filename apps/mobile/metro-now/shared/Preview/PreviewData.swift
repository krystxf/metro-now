// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import Foundation

enum PreviewData {
    static let userLocation = CLLocation(latitude: 50.0810, longitude: 14.4280)

    static let metroStop = ApiStop(
        id: "metro-mustek",
        name: "Mustek",
        avgLatitude: 50.0812,
        avgLongitude: 14.4245,
        entrances: [
            ApiStopEntrance(
                id: "mustek-a",
                name: "Mustek A",
                latitude: 50.0810,
                longitude: 14.4242
            ),
            ApiStopEntrance(
                id: "mustek-b",
                name: "Mustek B",
                latitude: 50.0815,
                longitude: 14.4249
            ),
        ],
        platforms: [
            ApiPlatform(
                id: "mustek-a-east",
                latitude: 50.0810,
                longitude: 14.4243,
                name: "Mustek A eastbound",
                code: "A",
                isMetro: true,
                routes: [ApiRoute(id: "991", name: "A")]
            ),
            ApiPlatform(
                id: "mustek-b-north",
                latitude: 50.0814,
                longitude: 14.4250,
                name: "Mustek B northbound",
                code: "B",
                isMetro: true,
                routes: [ApiRoute(id: "992", name: "B")]
            ),
        ]
    )

    static let cityStop = ApiStop(
        id: "tram-lazarska",
        name: "Lazarska",
        avgLatitude: 50.0793,
        avgLongitude: 14.4188,
        entrances: [],
        platforms: [
            ApiPlatform(
                id: "lazarska-1",
                latitude: 50.0791,
                longitude: 14.4186,
                name: "Lazarska platform 1",
                code: "1",
                isMetro: false,
                routes: [
                    ApiRoute(id: "22", name: "22"),
                    ApiRoute(id: "97", name: "97"),
                ]
            ),
            ApiPlatform(
                id: "lazarska-bus-a",
                latitude: 50.0795,
                longitude: 14.4190,
                name: "Lazarska bus stand A",
                code: "A",
                isMetro: false,
                routes: [
                    ApiRoute(id: "149", name: "149"),
                    ApiRoute(id: "207", name: "207"),
                ]
            ),
        ]
    )

    static let transferStop = ApiStop(
        id: "museum",
        name: "Muzeum",
        avgLatitude: 50.0799,
        avgLongitude: 14.4301,
        entrances: [
            ApiStopEntrance(
                id: "museum-main",
                name: "Main hall",
                latitude: 50.0798,
                longitude: 14.4302
            ),
        ],
        platforms: [
            ApiPlatform(
                id: "museum-a",
                latitude: 50.0796,
                longitude: 14.4304,
                name: "Muzeum A",
                code: "A",
                isMetro: true,
                routes: [ApiRoute(id: "991", name: "A")]
            ),
            ApiPlatform(
                id: "museum-c",
                latitude: 50.0800,
                longitude: 14.4298,
                name: "Muzeum C",
                code: "C",
                isMetro: true,
                routes: [ApiRoute(id: "993", name: "C")]
            ),
            ApiPlatform(
                id: "museum-tram",
                latitude: 50.0802,
                longitude: 14.4307,
                name: "Muzeum tram",
                code: "2",
                isMetro: false,
                routes: [ApiRoute(id: "11", name: "11")]
            ),
        ]
    )

    static let stops = [
        metroStop,
        cityStop,
        transferStop,
    ]

    static let departures = [
        ApiDeparture(
            id: "dep-1",
            platformId: "mustek-a-east",
            platformCode: "A",
            headsign: "Depo Hostivar",
            departure: ApiDepartureDate(
                predicted: .now + 2 * 60,
                scheduled: .now + 2 * 60
            ),
            delay: 0,
            route: "A",
            routeId: "L991",
            isRealtime: true
        ),
        ApiDeparture(
            id: "dep-2",
            platformId: "mustek-a-east",
            platformCode: "A",
            headsign: "Depo Hostivar",
            departure: ApiDepartureDate(
                predicted: .now + 6 * 60,
                scheduled: .now + 6 * 60
            ),
            delay: 0,
            route: "A",
            routeId: "L991",
            isRealtime: true
        ),
        ApiDeparture(
            id: "dep-3",
            platformId: "mustek-b-north",
            platformCode: "B",
            headsign: "Cerny Most",
            departure: ApiDepartureDate(
                predicted: .now + 4 * 60,
                scheduled: .now + 4 * 60
            ),
            delay: 0,
            route: "B",
            routeId: "L992",
            isRealtime: true
        ),
        ApiDeparture(
            id: "dep-4",
            platformId: "lazarska-1",
            platformCode: "1",
            headsign: "Bila Hora",
            departure: ApiDepartureDate(
                predicted: .now + 3 * 60,
                scheduled: .now + 3 * 60
            ),
            delay: 0,
            route: "22",
            routeId: "L22",
            isRealtime: true
        ),
        ApiDeparture(
            id: "dep-5",
            platformId: "lazarska-bus-a",
            platformCode: "A",
            headsign: "Dejvicka",
            departure: ApiDepartureDate(
                predicted: .now + 8 * 60,
                scheduled: .now + 8 * 60
            ),
            delay: 0,
            route: "149",
            routeId: "L149",
            isRealtime: false
        ),
    ]

    static let infotext = ApiInfotext(
        id: "preview-infotext",
        text: "Metro line A service is limited between Dejvicka and Namesti Miru due to maintenance.",
        textEn: nil,
        priority: "HIGH",
        displayType: "TEXT",
        validFrom: "2026-04-12T08:00:00Z",
        validTo: "2026-04-12T18:00:00Z",
        relatedStops: [
            ApiInfotextRelatedStop(name: "Dejvicka"),
            ApiInfotextRelatedStop(name: "Namesti Miru"),
        ]
    )
}
