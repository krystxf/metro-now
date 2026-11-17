// metro-now
// https://github.com/krystxf/metro-now

@_spi(Experimental) import MapboxMaps
import SwiftUI
import UIKit

enum MapStyleOption {
    case system(ColorScheme)
    case satellite

    var mapboxStyle: MapStyle {
        switch self {
        case .system(.dark):
            .standard(
                lightPreset: .night,
                showPointOfInterestLabels: false,
                showTransitLabels: false
            )
        case .system:
            .standard(
                lightPreset: .day,
                showPointOfInterestLabels: false,
                showTransitLabels: false
            )
        case .satellite:
            .standardSatellite(
                showPointOfInterestLabels: false,
                showTransitLabels: false
            )
        }
    }

    var stopLabelTextColor: UIColor {
        switch self {
        case .system(.dark), .satellite:
            .white
        case .system:
            .label
        }
    }

    var stopLabelHaloColor: UIColor {
        switch self {
        case .system(.dark):
            UIColor.black.withAlphaComponent(0.65)
        case .system:
            UIColor.systemBackground.withAlphaComponent(0.92)
        case .satellite:
            UIColor.black.withAlphaComponent(0.82)
        }
    }

    var pidZoneBorderColor: Color {
        switch self {
        case .system(.dark):
            Color.white.opacity(0.35)
        case .system:
            Color.black.opacity(0.16)
        case .satellite:
            Color.white.opacity(0.55)
        }
    }
}
