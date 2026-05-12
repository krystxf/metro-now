// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation

enum MapAnnotationPreviewData {
    static let metroAnnotation: RailStopMapAnnotation = {
        let stop = PreviewData.metroStop
        return RailStopMapAnnotation(
            id: "preview-metro",
            stop: stop,
            platform: stop.platforms[0],
            coordinate: CLLocationCoordinate2D(
                latitude: stop.avgLatitude,
                longitude: stop.avgLongitude
            ),
            metroLineNames: ["A"],
            metroRoutes: [ApiRoute(id: "991", name: "A")],
            transportModes: []
        )
    }()

    static let transferAnnotation: RailStopMapAnnotation = {
        let stop = PreviewData.transferStop
        return RailStopMapAnnotation(
            id: "preview-transfer",
            stop: stop,
            platform: stop.platforms[0],
            coordinate: CLLocationCoordinate2D(
                latitude: stop.avgLatitude,
                longitude: stop.avgLongitude
            ),
            metroLineNames: ["A", "C"],
            metroRoutes: [
                ApiRoute(id: "991", name: "A"),
                ApiRoute(id: "993", name: "C"),
            ],
            transportModes: [.tram]
        )
    }()

    static let tramBusAnnotation: RailStopMapAnnotation = {
        let stop = PreviewData.cityStop
        return RailStopMapAnnotation(
            id: "preview-tram-bus",
            stop: stop,
            platform: stop.platforms[0],
            coordinate: CLLocationCoordinate2D(
                latitude: stop.avgLatitude,
                longitude: stop.avgLongitude
            ),
            metroLineNames: [],
            metroRoutes: [],
            transportModes: [.tram, .bus]
        )
    }()

    static let trainAnnotation: RailStopMapAnnotation = {
        let stop = PreviewData.cityStop
        return RailStopMapAnnotation(
            id: "preview-train",
            stop: ApiStop(
                id: stop.id,
                name: "Hlavni nadrazi",
                avgLatitude: stop.avgLatitude,
                avgLongitude: stop.avgLongitude,
                entrances: [],
                platforms: stop.platforms
            ),
            platform: stop.platforms[0],
            coordinate: CLLocationCoordinate2D(
                latitude: stop.avgLatitude,
                longitude: stop.avgLongitude
            ),
            metroLineNames: [],
            metroRoutes: [],
            transportModes: [.train, .leoExpress]
        )
    }()
}
