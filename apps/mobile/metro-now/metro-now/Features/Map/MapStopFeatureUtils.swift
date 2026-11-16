// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
@_spi(Experimental) import MapboxMaps
import SwiftUI
import UIKit

enum StopFeatureKeys {
    static let color = "color"
    static let priority = "priority"
    static let pointRadius = "point_radius"
    static let showsLabel = "shows_label"
    static let stopName = "stop_name"
}

func annotationDotColor(for annotation: RailStopMapAnnotation) -> Color {
    if annotation.isMetro, let firstRoute = annotation.metroRoutes.first {
        return getRouteColor(firstRoute)
    }

    if let firstMode = annotation.transportModes.first {
        switch firstMode {
        case .train: return RouteType.train.color
        case .leoExpress: return RouteType.leoExpress.color
        case .funicular: return RouteType.funicular.color
        case .ferry: return RouteType.ferry.color
        case .tram: return RouteType.tram.color
        case .bus: return RouteType.bus.color
        }
    }

    return .gray
}

func colorHex(from color: Color) -> String {
    let uiColor = UIColor(color)
    var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
    uiColor.getRed(&r, green: &g, blue: &b, alpha: &a)
    return String(format: "#%02X%02X%02X", Int(r * 255), Int(g * 255), Int(b * 255))
}

func shouldRenderStopLabel(for annotation: RailStopMapAnnotation) -> Bool {
    annotation.isMetro
        || annotation.transportModes.contains(.train)
        || annotation.transportModes.contains(.leoExpress)
}

func stopPointRadius(for annotation: RailStopMapAnnotation) -> Double {
    if annotation.isMetro {
        return 7
    }

    if annotation.transportModes.contains(.train) || annotation.transportModes.contains(.leoExpress) {
        return 6
    }

    if annotation.transportModes.contains(.ferry) {
        return 5.5
    }

    return 5
}

func buildVisibleStopFeature(
    from annotation: RailStopMapAnnotation
) -> Feature {
    var feature = Feature(geometry: .point(Point(annotation.coordinate)))
    feature.identifier = .string(annotation.id)
    feature.properties = [
        StopFeatureKeys.color: .string(colorHex(from: annotationDotColor(for: annotation))),
        StopFeatureKeys.pointRadius: .number(stopPointRadius(for: annotation)),
        StopFeatureKeys.priority: .number(Double(annotation.priorityScore)),
        StopFeatureKeys.showsLabel: .boolean(shouldRenderStopLabel(for: annotation)),
        StopFeatureKeys.stopName: .string(annotation.stopName),
    ]
    return feature
}

func buildRoutePolylines(
    from routes: [ApiRouteDetail]
) -> [FlatRoutePolyline] {
    routes.flatMap { route in
        let color = UIColor(getRouteColor(route)).withAlphaComponent(0.2)
        return route.preferredMapShapes.map { shape in
            FlatRoutePolyline(
                id: shape.id,
                coordinates: shape.normalizedCoordinates.map {
                    CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude)
                },
                color: color
            )
        }
    }
}

func hasMatchingPolylineIdentities(
    _ lhs: [PidZoneBorderPolyline],
    _ rhs: [PidZoneBorderPolyline]
) -> Bool {
    guard lhs.count == rhs.count else {
        return false
    }

    return zip(lhs, rhs).allSatisfy { left, right in
        left.id == right.id
    }
}
