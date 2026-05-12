// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import Foundation

extension SearchStopDetailView {
    var relatedInfotexts: [ApiInfotext] {
        // Map surface-platform display stops wrap the base stop with a
        // platform-label name (e.g., "Můstek A"), so `stop.name` doesn't
        // match infotext `relatedStops.name` ("Můstek"). Fall back to the
        // underlying platform names, which are the station name.
        var candidates = Set<String>()
        let trimmed = stop.name.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            candidates.insert(trimmed.lowercased())
        }
        for platform in stop.platforms {
            let name = platform.name.trimmingCharacters(in: .whitespacesAndNewlines)
            if !name.isEmpty {
                candidates.insert(name.lowercased())
            }
        }
        guard !candidates.isEmpty else { return [] }
        return infotextsViewModel.infotexts
            .filter { infotext in
                infotext.relatedStops.contains { related in
                    let name = related.name.trimmingCharacters(in: .whitespacesAndNewlines)
                    return candidates.contains(name.lowercased())
                }
            }
            .sorted { $0.severity.sortOrder < $1.severity.sortOrder }
    }

    func handleRoutePreview(_ item: SheetIdItem) {
        if let sidebarRoutePreviewPresenter {
            sidebarRoutePreviewPresenter(item)
        } else {
            routePreviewItem = item
        }
    }

    var metroPlatforms: [ApiPlatform] {
        stop.platforms.filter(\.isMetro)
    }

    var nonMetroPlatforms: [ApiPlatform] {
        stop.platforms
            .filter { platform in
                !platform.isMetro
            }
            .sorted { left, right in
                getPlatformLabel(left) < getPlatformLabel(right)
            }
    }

    var hasRealtimeData: Bool {
        viewModel.departures?.contains(where: { $0.isRealtime == true }) ?? false
    }

    var stopDistanceFromUser: CLLocationDistance? {
        guard showsDistanceFromUser,
              let location = locationModel.location
        else {
            return nil
        }

        return stop.distance(to: location)
    }

    var formattedStopDistanceFromUser: String? {
        guard let stopDistanceFromUser else {
            return nil
        }

        return Measurement(value: stopDistanceFromUser, unit: UnitLength.meters).formatted(
            .measurement(
                width: .abbreviated,
                usage: .road,
                numberFormatStyle: .number.precision(.fractionLength(0))
            )
        )
    }

    func platformPrimaryLabel(_ platform: ApiPlatform) -> String {
        if let code = platform.code, !code.isEmpty {
            return "Platform \(code)"
        }
        return platform.name
    }

    var metroStop: ApiStop {
        ApiStop(
            id: stop.id,
            name: stop.name,
            avgLatitude: stop.avgLatitude,
            avgLongitude: stop.avgLongitude,
            entrances: stop.entrances,
            platforms: metroPlatforms
        )
    }
}
