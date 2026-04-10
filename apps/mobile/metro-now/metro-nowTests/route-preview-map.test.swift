// metro-now
// https://github.com/krystxf/metro-now

import Foundation
import Testing

@Suite(.tags(.api, .map))
struct RoutePreviewMapTests {
    private func decodeRouteDetail(from json: String) throws -> ApiRouteDetail {
        try JSONDecoder().decode(ApiRouteDetail.self, from: Data(json.utf8))
    }

    @Test("prefers direction-specific shapes for the route preview map")
    func prefersDirectionSpecificShapes() throws {
        let routeDetail = try decodeRouteDetail(
            from: """
            {
              "id": "L991",
              "name": "Metro A",
              "shortName": "A",
              "longName": null,
              "isNight": false,
              "color": null,
              "url": null,
              "type": "metro",
              "directions": [
                {
                  "id": "dir-a",
                  "platforms": [
                    {
                      "id": "p1",
                      "latitude": 50.075,
                      "longitude": 14.44,
                      "name": "Nemocnice Motol",
                      "isMetro": true,
                      "code": "M1"
                    }
                  ]
                },
                {
                  "id": "dir-b",
                  "platforms": [
                    {
                      "id": "p2",
                      "latitude": 50.08,
                      "longitude": 14.42,
                      "name": "Depo Hostivař",
                      "isMetro": true,
                      "code": "M2"
                    }
                  ]
                }
              ],
              "shapes": [
                {
                  "id": "shape-a",
                  "directionId": "dir-a",
                  "tripCount": 12,
                  "points": [
                    { "latitude": 50.075, "longitude": 14.44, "sequence": 1 },
                    { "latitude": 50.076, "longitude": 14.435, "sequence": 2 }
                  ]
                },
                {
                  "id": "shape-b",
                  "directionId": "dir-b",
                  "tripCount": 8,
                  "points": [
                    { "latitude": 50.08, "longitude": 14.42, "sequence": 1 },
                    { "latitude": 50.081, "longitude": 14.418, "sequence": 2 }
                  ]
                },
                {
                  "id": "shape-b-duplicate",
                  "directionId": "dir-b",
                  "tripCount": 5,
                  "points": [
                    { "latitude": 50.08, "longitude": 14.42, "sequence": 1 },
                    { "latitude": 50.081, "longitude": 14.418, "sequence": 2 }
                  ]
                }
              ]
            }
            """
        )
        let direction = try #require(
            routeDetail.directions.first(where: { $0.id == "dir-b" })
        )

        let shapes = routeDetail.preferredMapShapes(for: direction)

        #expect(shapes.count == 1)
        #expect(shapes.first?.id == "shape-b")
    }

    @Test("falls back to preferred route shapes when direction-specific geometry is unavailable")
    func fallsBackToPreferredShapes() throws {
        let routeDetail = try decodeRouteDetail(
            from: """
            {
              "id": "L742",
              "name": "Train S7",
              "shortName": "S7",
              "longName": null,
              "isNight": false,
              "color": null,
              "url": null,
              "type": "train",
              "directions": [
                {
                  "id": "dir-main",
                  "platforms": [
                    {
                      "id": "p1",
                      "latitude": 50.1,
                      "longitude": 14.3,
                      "name": "Praha hl.n.",
                      "isMetro": false,
                      "code": null
                    }
                  ]
                }
              ],
              "shapes": [
                {
                  "id": "shared-shape",
                  "directionId": null,
                  "tripCount": 10,
                  "points": [
                    { "latitude": 50.1, "longitude": 14.3, "sequence": 1 },
                    { "latitude": 50.12, "longitude": 14.28, "sequence": 2 }
                  ]
                },
                {
                  "id": "shared-shape-duplicate",
                  "directionId": null,
                  "tripCount": 7,
                  "points": [
                    { "latitude": 50.1, "longitude": 14.3, "sequence": 1 },
                    { "latitude": 50.12, "longitude": 14.28, "sequence": 2 }
                  ]
                }
              ]
            }
            """
        )
        let direction = try #require(routeDetail.directions.first)

        let shapes = routeDetail.preferredMapShapes(for: direction)

        #expect(shapes.count == 1)
        #expect(shapes.first?.id == "shared-shape")
    }
}
