
import MapKit
import SwiftUI

struct StopAnnotation: View {
    let routes: [String]
    var stopIcon: String
    let isMetro: Bool

    init(routes: [String]) {
        isMetro = routes.allSatisfy { METRO_LINES.contains($0) }
        self.routes = routes

        guard !isMetro else {
            stopIcon = "tram.circle.fill"
            return
        }

        let transportTypes = Set(routes.map {
            getVehicleType($0)
        })

        if transportTypes.contains(.bus) {
            stopIcon = "bus"
        } else {
            stopIcon = transportTypes.first!.rawValue
        }
    }

    var body: some View {
        if isMetro {
            MetroAnnotationStack(metroLines: routes)
        } else {
            Image(
                systemName: stopIcon
            )
            .imageScale(.small)
            .padding(3)
            .font(.system(size: 16))
            .foregroundStyle(.white)
            .background(
                LinearGradient(
                    gradient: Gradient(colors: getBgColors(routes)

                    ),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(.rect(cornerRadius: 4))
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .stroke(.white, lineWidth: 2)
            )
        }
    }
}

#Preview("Metro") {
    Map {
        Annotation(
            "Random place on map", coordinate: CLLocationCoordinate2D(
                latitude: 50.113680, longitude: 14.449520)
        ) {
            StopAnnotation(
                routes: ["A"]
            )
        }
    }
}

#Preview("Metro Stack") {
    Map {
        Annotation(
            "Random place on map", coordinate: CLLocationCoordinate2D(
                latitude: 50.113680, longitude: 14.449520)
        ) {
            StopAnnotation(
                routes: ["A", "C"]
            )
        }
    }
}

#Preview("Tram") {
    Map {
        Annotation(
            "Random place on map", coordinate: CLLocationCoordinate2D(
                latitude: 50.113680, longitude: 14.449520)
        ) {
            StopAnnotation(
                routes: ["78"]
            )
        }
    }
}

#Preview("Night Tram") {
    Map {
        Annotation(
            "Random place on map", coordinate: CLLocationCoordinate2D(
                latitude: 50.113680, longitude: 14.449520)
        ) {
            StopAnnotation(
                routes: ["90"]
            )
        }
    }
}

#Preview("Bus") {
    Map {
        Annotation(
            "Random place on map", coordinate: CLLocationCoordinate2D(
                latitude: 50.113680, longitude: 14.449520)
        ) {
            StopAnnotation(
                routes: ["700"]
            )
        }
    }
}

#Preview("Bus & Tram") {
    Map {
        Annotation(
            "Random place on map", coordinate: CLLocationCoordinate2D(
                latitude: 50.113680, longitude: 14.449520)
        ) {
            StopAnnotation(
                routes: ["60", "700"]
            )
        }
    }
}

#Preview("Night Bus") {
    Map {
        Annotation(
            "Random place on map", coordinate: CLLocationCoordinate2D(
                latitude: 50.113680, longitude: 14.449520)
        ) {
            StopAnnotation(
                routes: ["900"]
            )
        }
    }
}

#Preview("Detour") {
    Map {
        Annotation(
            "Random place on map", coordinate: CLLocationCoordinate2D(
                latitude: 50.113680, longitude: 14.449520)
        ) {
            StopAnnotation(
                routes: ["X700"]
            )
        }
    }
}

#Preview("Ferry") {
    Map {
        Annotation(
            "Random place on map", coordinate: CLLocationCoordinate2D(
                latitude: 50.113680, longitude: 14.449520)
        ) {
            StopAnnotation(
                routes: ["P4"]
            )
        }
    }
}

#Preview("Cable car") {
    Map {
        Annotation(
            "Random place on map", coordinate: CLLocationCoordinate2D(
                latitude: 50.113680, longitude: 14.449520)
        ) {
            StopAnnotation(
                routes: ["LD"]
            )
        }
    }
}

#Preview("Train") {
    Map {
        Annotation(
            "Random place on map", coordinate: CLLocationCoordinate2D(
                latitude: 50.113680, longitude: 14.449520)
        ) {
            StopAnnotation(
                routes: ["S42"]
            )
        }
    }
}
