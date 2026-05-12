// metro-now
// https://github.com/krystxf/metro-now

import CoreGraphics
import CoreLocation
import Foundation
import MapKit

enum RailStopTransportMode: String, Hashable, CaseIterable {
    case train
    case leoExpress
    case funicular
    case ferry
    case tram
    case bus
}

struct RailStopMapAnnotation: Identifiable {
    let id: String
    let stop: ApiStop
    let platform: ApiPlatform
    let coordinate: CLLocationCoordinate2D
    let metroLineNames: [String]
    let metroRoutes: [ApiRoute]
    let transportModes: [RailStopTransportMode]

    init(
        id: String,
        stop: ApiStop,
        platform: ApiPlatform,
        coordinate: CLLocationCoordinate2D,
        metroLineNames: [String],
        metroRoutes: [ApiRoute] = [],
        transportModes: [RailStopTransportMode]
    ) {
        self.id = id
        self.stop = stop
        self.platform = platform
        self.coordinate = coordinate
        self.metroLineNames = metroLineNames
        self.metroRoutes = metroRoutes
        self.transportModes = transportModes
    }

    var stopName: String {
        stop.name
    }

    var isMetro: Bool {
        !metroLineNames.isEmpty
    }

    var priorityScore: Int {
        if isMetro {
            return 100 + metroLineNames.count * 10
        }

        if transportModes.contains(.train) || transportModes.contains(.leoExpress) {
            return 90
        }

        if transportModes.contains(.ferry) {
            return 80
        }

        return transportModes.count * 10
    }
}

private struct RailStopGridCell: Hashable {
    let x: Int
    let y: Int
}

struct RailStopSpatialIndex {
    private let cellSizeDegrees: Double
    private let buckets: [RailStopGridCell: [RailStopMapAnnotation]]
    let annotations: [RailStopMapAnnotation]

    init(
        annotations: [RailStopMapAnnotation],
        cellSizeDegrees: Double = 0.01
    ) {
        self.annotations = annotations
        self.cellSizeDegrees = max(cellSizeDegrees, 0.0001)

        let resolvedCellSizeDegrees = self.cellSizeDegrees
        var buckets: [RailStopGridCell: [RailStopMapAnnotation]] = [:]

        for annotation in annotations {
            let gridCell = RailStopGridCell(
                x: Int(floor(annotation.coordinate.longitude / resolvedCellSizeDegrees)),
                y: Int(floor(annotation.coordinate.latitude / resolvedCellSizeDegrees))
            )

            buckets[gridCell, default: []].append(annotation)
        }

        self.buckets = buckets
    }

    func visibleAnnotations(
        in region: MKCoordinateRegion,
        paddingFactor: Double,
        maximumCount: Int,
        viewportSize: CGSize = .zero,
        minimumSpacingPoints: CGFloat = 0
    ) -> [RailStopMapAnnotation] {
        guard
            maximumCount > 0,
            let expandedRegion = expandedRegion(
                from: region,
                paddingFactor: paddingFactor
            )
        else {
            return []
        }

        let visibleCandidates = candidates(in: expandedRegion).filter { annotation in
            isCoordinate(annotation.coordinate, inside: expandedRegion)
        }

        return sampledAnnotations(
            from: visibleCandidates,
            in: expandedRegion,
            maximumCount: maximumCount,
            viewportSize: viewportSize,
            minimumSpacingPoints: minimumSpacingPoints
        )
        .sorted { left, right in
            if left.priorityScore != right.priorityScore {
                return left.priorityScore > right.priorityScore
            }

            return left.id < right.id
        }
    }

    private func candidates(in region: MKCoordinateRegion) -> [RailStopMapAnnotation] {
        guard !buckets.isEmpty else {
            return []
        }

        let minimumLatitude = region.center.latitude - region.span.latitudeDelta / 2
        let maximumLatitude = region.center.latitude + region.span.latitudeDelta / 2
        let minimumLongitude = region.center.longitude - region.span.longitudeDelta / 2
        let maximumLongitude = region.center.longitude + region.span.longitudeDelta / 2

        let minimumCell = cell(
            for: CLLocationCoordinate2D(
                latitude: minimumLatitude,
                longitude: minimumLongitude
            )
        )
        let maximumCell = cell(
            for: CLLocationCoordinate2D(
                latitude: maximumLatitude,
                longitude: maximumLongitude
            )
        )

        var candidates: [RailStopMapAnnotation] = []
        candidates.reserveCapacity(
            max(
                32,
                (maximumCell.x - minimumCell.x + 1) * (maximumCell.y - minimumCell.y + 1)
            )
        )

        for x in minimumCell.x ... maximumCell.x {
            for y in minimumCell.y ... maximumCell.y {
                candidates.append(
                    contentsOf: buckets[RailStopGridCell(x: x, y: y)] ?? []
                )
            }
        }

        return candidates
    }

    private func sampledAnnotations(
        from annotations: [RailStopMapAnnotation],
        in region: MKCoordinateRegion,
        maximumCount: Int,
        viewportSize: CGSize,
        minimumSpacingPoints: CGFloat
    ) -> [RailStopMapAnnotation] {
        let gridDimensions = samplingGridDimensions(
            in: region,
            maximumCount: maximumCount,
            viewportSize: viewportSize,
            minimumSpacingPoints: minimumSpacingPoints
        )
        let effectiveMaximumCount = min(
            maximumCount,
            gridDimensions.columns * gridDimensions.rows
        )

        guard annotations.count > effectiveMaximumCount else {
            return annotations
        }

        let latitudeDelta = max(region.span.latitudeDelta, 0.0001)
        let longitudeDelta = max(region.span.longitudeDelta, 0.0001)
        let columnCount = gridDimensions.columns
        let rowCount = gridDimensions.rows

        let latitudeStep = latitudeDelta / Double(rowCount)
        let longitudeStep = longitudeDelta / Double(columnCount)
        let minimumLatitude = region.center.latitude - latitudeDelta / 2
        let minimumLongitude = region.center.longitude - longitudeDelta / 2

        var representatives: [RailStopGridCell: RailStopMapAnnotation] = [:]

        for annotation in annotations {
            let row = clampedGridIndex(
                for: annotation.coordinate.latitude,
                minimumValue: minimumLatitude,
                step: latitudeStep,
                upperBound: rowCount
            )
            let column = clampedGridIndex(
                for: annotation.coordinate.longitude,
                minimumValue: minimumLongitude,
                step: longitudeStep,
                upperBound: columnCount
            )

            let gridCell = RailStopGridCell(x: column, y: row)
            let cellCenter = CLLocationCoordinate2D(
                latitude: minimumLatitude + (Double(row) + 0.5) * latitudeStep,
                longitude: minimumLongitude + (Double(column) + 0.5) * longitudeStep
            )

            if let current = representatives[gridCell] {
                if shouldPrefer(
                    annotation,
                    over: current,
                    relativeTo: cellCenter,
                    mapCenter: region.center
                ) {
                    representatives[gridCell] = annotation
                }
            } else {
                representatives[gridCell] = annotation
            }
        }

        var sampled = Array(representatives.values)

        if sampled.count > effectiveMaximumCount {
            sampled.sort { left, right in
                coordinateDistanceSquared(
                    left.coordinate,
                    to: region.center
                ) < coordinateDistanceSquared(
                    right.coordinate,
                    to: region.center
                )
            }
            sampled = Array(sampled.prefix(effectiveMaximumCount))
        }

        return sampled
    }

    private func samplingGridDimensions(
        in region: MKCoordinateRegion,
        maximumCount: Int,
        viewportSize: CGSize,
        minimumSpacingPoints: CGFloat
    ) -> (columns: Int, rows: Int) {
        let resolvedSpacingPoints = max(Double(minimumSpacingPoints), 1)
        let resolvedViewportWidth = max(Double(viewportSize.width), 0)
        let resolvedViewportHeight = max(Double(viewportSize.height), 0)

        if resolvedViewportWidth > 0,
           resolvedViewportHeight > 0,
           minimumSpacingPoints > 0
        {
            return (
                columns: max(Int(floor(resolvedViewportWidth / resolvedSpacingPoints)), 1),
                rows: max(Int(floor(resolvedViewportHeight / resolvedSpacingPoints)), 1)
            )
        }

        let latitudeDelta = max(region.span.latitudeDelta, 0.0001)
        let longitudeDelta = max(region.span.longitudeDelta, 0.0001)
        let aspectRatio = max(longitudeDelta / latitudeDelta, 0.5)
        let columnCount = max(
            Int(round(sqrt(Double(maximumCount) * aspectRatio))),
            1
        )
        let rowCount = max(
            Int(ceil(Double(maximumCount) / Double(columnCount))),
            1
        )

        return (columns: columnCount, rows: rowCount)
    }

    private func cell(for coordinate: CLLocationCoordinate2D) -> RailStopGridCell {
        RailStopGridCell(
            x: Int(floor(coordinate.longitude / cellSizeDegrees)),
            y: Int(floor(coordinate.latitude / cellSizeDegrees))
        )
    }

    private func clampedGridIndex(
        for value: Double,
        minimumValue: Double,
        step: Double,
        upperBound: Int
    ) -> Int {
        guard upperBound > 1 else {
            return 0
        }

        let rawIndex = Int(floor((value - minimumValue) / max(step, 0.0001)))

        return min(max(rawIndex, 0), upperBound - 1)
    }

    private func shouldPrefer(
        _ candidate: RailStopMapAnnotation,
        over current: RailStopMapAnnotation,
        relativeTo cellCenter: CLLocationCoordinate2D,
        mapCenter: CLLocationCoordinate2D
    ) -> Bool {
        if candidate.priorityScore != current.priorityScore {
            return candidate.priorityScore > current.priorityScore
        }

        let candidateCellDistance = coordinateDistanceSquared(
            candidate.coordinate,
            to: cellCenter
        )
        let currentCellDistance = coordinateDistanceSquared(
            current.coordinate,
            to: cellCenter
        )

        if candidateCellDistance != currentCellDistance {
            return candidateCellDistance < currentCellDistance
        }

        let candidateMapDistance = coordinateDistanceSquared(
            candidate.coordinate,
            to: mapCenter
        )
        let currentMapDistance = coordinateDistanceSquared(
            current.coordinate,
            to: mapCenter
        )

        if candidateMapDistance != currentMapDistance {
            return candidateMapDistance < currentMapDistance
        }

        return candidate.id < current.id
    }
}

func buildRailStopMapAnnotations(from stops: [ApiStop]) -> [RailStopMapAnnotation] {
    stops.flatMap(buildRailStopMapAnnotations(for:))
}

func isMetroRoute(_ route: ApiRoute) -> Bool {
    if route.vehicleType?.uppercased() == "SUBWAY" {
        return true
    }

    return METRO_LINES.contains(route.name.uppercased())
}

func isMetroPlatform(_ platform: ApiPlatform) -> Bool {
    platform.isMetro || platform.routes.contains(where: isMetroRoute)
}

func isBarcelonaMapTramRoute(_ route: ApiRoute) -> Bool {
    guard
        route.feed?.uppercased() == "BARCELONA",
        route.vehicleType?.uppercased() == "TRAM"
    else {
        return false
    }

    let normalizedName = route.name
        .trimmingCharacters(in: .whitespacesAndNewlines)
        .uppercased()

    guard normalizedName.hasPrefix("T"), normalizedName.count == 2 else {
        return false
    }

    guard let lineNumber = Int(normalizedName.dropFirst()) else {
        return false
    }

    return (1 ... 6).contains(lineNumber)
}

func shouldShowMapRouteOverlay(_ route: ApiRoute) -> Bool {
    isMetroRoute(route) || isBarcelonaMapTramRoute(route)
}

func maximumRailAnnotationCount(for region: MKCoordinateRegion) -> Int {
    let spanDelta = max(region.span.latitudeDelta, region.span.longitudeDelta)

    switch spanDelta {
    case ..<0.02:
        return 220
    case ..<0.05:
        return 160
    case ..<0.1:
        return 120
    case ..<0.18:
        return 90
    default:
        return 60
    }
}

func maximumRailAnnotationCount(
    for region: MKCoordinateRegion,
    viewportSize: CGSize,
    minimumSpacingPoints: CGFloat
) -> Int {
    let spanLimitedMaximumCount = maximumRailAnnotationCount(for: region)

    guard viewportSize.width > 0,
          viewportSize.height > 0,
          minimumSpacingPoints > 0
    else {
        return spanLimitedMaximumCount
    }

    let columns = max(
        Int(floor(Double(viewportSize.width) / Double(minimumSpacingPoints))),
        1
    )
    let rows = max(
        Int(floor(Double(viewportSize.height) / Double(minimumSpacingPoints))),
        1
    )

    return min(spanLimitedMaximumCount, columns * rows)
}

func expandedRegion(
    from region: MKCoordinateRegion,
    paddingFactor: Double
) -> MKCoordinateRegion? {
    guard paddingFactor >= 0 else {
        return nil
    }

    return MKCoordinateRegion(
        center: region.center,
        span: MKCoordinateSpan(
            latitudeDelta: region.span.latitudeDelta * (1 + paddingFactor * 2),
            longitudeDelta: region.span.longitudeDelta * (1 + paddingFactor * 2)
        )
    )
}

func isCoordinate(
    _ coordinate: CLLocationCoordinate2D,
    inside region: MKCoordinateRegion
) -> Bool {
    let latitudeRange = (region.center.latitude - region.span.latitudeDelta / 2) ... (region.center.latitude + region.span.latitudeDelta / 2)
    let longitudeRange = (region.center.longitude - region.span.longitudeDelta / 2) ... (region.center.longitude + region.span.longitudeDelta / 2)

    return latitudeRange.contains(coordinate.latitude)
        && longitudeRange.contains(coordinate.longitude)
}

private func metroRouteLineNames(for platforms: [ApiPlatform]) -> [String] {
    Array(
        Set(
            platforms
                .flatMap(\.routes)
                .filter(isMetroRoute)
                .map(\.name)
        )
    )
    .sorted()
}

private func metroRoutes(for platforms: [ApiPlatform]) -> [ApiRoute] {
    uniqueBy(
        array: platforms
            .flatMap(\.routes)
            .filter(isMetroRoute)
            .sorted { left, right in
                left.name.localizedCompare(right.name) == .orderedAscending
            },
        by: \.id
    )
}

private func stopTransportModes(
    for platforms: [ApiPlatform],
    allowedModes: Set<RailStopTransportMode> = Set(RailStopTransportMode.allCases)
) -> [RailStopTransportMode] {
    let modes = Set(
        platforms
            .flatMap(\.routes)
            .compactMap { route in
                mapTransportMode(for: route)
            }
    )

    return RailStopTransportMode.allCases.filter { mode in
        modes.contains(mode) && allowedModes.contains(mode)
    }
}

func mapTransportMode(for route: ApiRoute) -> RailStopTransportMode? {
    switch getRouteType(route) {
    case .train:
        .train
    case .leoExpress:
        .leoExpress
    case .funicular:
        .funicular
    case .ferry:
        .ferry
    case .tram:
        .tram
    case .bus:
        .bus
    case .night:
        nightTransportMode(for: route)
    default:
        nil
    }
}

func isMapVisibleRoute(_ route: ApiRoute) -> Bool {
    mapTransportMode(for: route) != nil
}

/// For night routes the backend only signals `isNight`; the physical vehicle
/// type tells us whether a given night route runs as a tram or bus.
private func nightTransportMode(for route: ApiRoute) -> RailStopTransportMode? {
    switch route.vehicleType?.uppercased() {
    case "TRAM":
        .tram
    case "BUS", "TROLLEYBUS":
        .bus
    default:
        nil
    }
}

private func buildRailStopMapAnnotations(for stop: ApiStop) -> [RailStopMapAnnotation] {
    buildMetroStationAnnotations(for: stop)
        + buildTrainStationAnnotations(for: stop)
        + stop.platforms.compactMap { platform in
            buildSurfacePlatformAnnotation(
                for: stop,
                platform: platform
            )
        }
}

private func buildMetroStationAnnotations(for stop: ApiStop) -> [RailStopMapAnnotation] {
    let metroPlatforms = stop.platforms.filter(isMetroPlatform)

    guard !metroPlatforms.isEmpty else {
        return []
    }

    let groupedPlatforms = Dictionary(
        grouping: metroPlatforms,
        by: stationGroupKey(for:)
    )
    .values
    .map { platforms in
        platforms.sorted(by: comparePlatforms)
    }
    .sorted { left, right in
        let leftName = resolvedStationName(
            for: left,
            fallbackName: stop.name
        )
        let rightName = resolvedStationName(
            for: right,
            fallbackName: stop.name
        )

        if leftName != rightName {
            return leftName.localizedCompare(rightName) == .orderedAscending
        }

        return (left.first?.id ?? "") < (right.first?.id ?? "")
    }

    return groupedPlatforms.compactMap { platforms in
        buildMetroStationAnnotation(
            for: stop,
            platforms: platforms,
            useStopEntrances: groupedPlatforms.count == 1
        )
    }
}

private func buildMetroStationAnnotation(
    for stop: ApiStop,
    platforms: [ApiPlatform],
    useStopEntrances: Bool
) -> RailStopMapAnnotation? {
    guard let representativePlatform = platforms.first else {
        return nil
    }

    let metroRoutes = resolvedMetroRoutes(
        for: platforms,
        within: stop
    )

    guard !metroRoutes.isEmpty else {
        return nil
    }

    let displayStop = buildMetroDisplayStop(
        originalStop: stop,
        platforms: platforms,
        useStopEntrances: useStopEntrances
    )

    return RailStopMapAnnotation(
        id: displayStop.id,
        stop: displayStop,
        platform: representativePlatform,
        coordinate: displayStop.preferredCoordinate,
        metroLineNames: metroRoutes.map(\.name),
        metroRoutes: metroRoutes,
        transportModes: []
    )
}

private func resolvedMetroRoutes(
    for platforms: [ApiPlatform],
    within stop: ApiStop
) -> [ApiRoute] {
    guard platforms.allSatisfy(isMetroPlatform) else {
        return []
    }

    let platformRoutes = metroRoutes(for: platforms)

    if !platformRoutes.isEmpty {
        return Array(platformRoutes.prefix(2))
    }

    return Array(
        metroRoutes(
            for: stop.platforms.filter(isMetroPlatform)
        )
        .prefix(2)
    )
}

private func buildTrainStationAnnotations(for stop: ApiStop) -> [RailStopMapAnnotation] {
    let trainPlatforms = stop.platforms.compactMap { platform in
        filteredPlatform(
            platform,
            allowedModes: [.train, .leoExpress]
        )
    }

    guard !trainPlatforms.isEmpty else {
        return []
    }

    let groupedPlatforms = Dictionary(
        grouping: trainPlatforms,
        by: stationGroupKey(for:)
    )
    .values
    .map { platforms in
        platforms.sorted(by: comparePlatforms)
    }
    .sorted { left, right in
        let leftName = resolvedStationName(
            for: left,
            fallbackName: stop.name
        )
        let rightName = resolvedStationName(
            for: right,
            fallbackName: stop.name
        )

        if leftName != rightName {
            return leftName.localizedCompare(rightName) == .orderedAscending
        }

        return (left.first?.id ?? "") < (right.first?.id ?? "")
    }

    return groupedPlatforms.compactMap { platforms in
        buildTrainStationAnnotation(
            for: stop,
            platforms: platforms
        )
    }
}

private func buildTrainStationAnnotation(
    for stop: ApiStop,
    platforms: [ApiPlatform]
) -> RailStopMapAnnotation? {
    guard let representativePlatform = platforms.first else {
        return nil
    }

    let displayStop = buildGroupedDisplayStop(
        originalStop: stop,
        kind: "train",
        platforms: platforms,
        useStopEntrances: false
    )

    let modes = stopTransportModes(
        for: platforms,
        allowedModes: [.train, .leoExpress]
    )

    return RailStopMapAnnotation(
        id: displayStop.id,
        stop: displayStop,
        platform: representativePlatform,
        coordinate: CLLocationCoordinate2D(
            latitude: displayStop.avgLatitude,
            longitude: displayStop.avgLongitude
        ),
        metroLineNames: [],
        transportModes: modes.isEmpty ? [.train] : modes
    )
}

private func buildSurfacePlatformAnnotation(
    for stop: ApiStop,
    platform: ApiPlatform
) -> RailStopMapAnnotation? {
    guard
        let surfacePlatform = filteredPlatform(
            platform,
            allowedModes: [.funicular, .ferry, .tram, .bus]
        )
    else {
        return nil
    }

    let transportModes = stopTransportModes(for: [surfacePlatform])

    let displayStop = buildSurfaceDisplayStop(
        originalStop: stop,
        platform: surfacePlatform
    )

    return RailStopMapAnnotation(
        id: "\(surfacePlatform.id):surface",
        stop: displayStop,
        platform: surfacePlatform,
        coordinate: surfacePlatform.coordinate,
        metroLineNames: [],
        transportModes: transportModes
    )
}

private func buildMetroDisplayStop(
    originalStop: ApiStop,
    platforms: [ApiPlatform],
    useStopEntrances: Bool
) -> ApiStop {
    buildGroupedDisplayStop(
        originalStop: originalStop,
        kind: "metro",
        platforms: platforms,
        useStopEntrances: useStopEntrances
    )
}

private func buildSurfaceDisplayStop(
    originalStop: ApiStop,
    platform: ApiPlatform
) -> ApiStop {
    ApiStop(
        id: "\(originalStop.id):\(platform.id)",
        name: getPlatformLabel(platform),
        avgLatitude: platform.latitude,
        avgLongitude: platform.longitude,
        entrances: [],
        platforms: [platform]
    )
}

private func buildGroupedDisplayStop(
    originalStop: ApiStop,
    kind: String,
    platforms: [ApiPlatform],
    useStopEntrances: Bool
) -> ApiStop {
    let stationName = resolvedStationName(
        for: platforms,
        fallbackName: originalStop.name
    )
    let fallbackCoordinate = coordinateCentroid(
        for: platforms.map(\.coordinate)
    ) ?? CLLocationCoordinate2D(
        latitude: originalStop.avgLatitude,
        longitude: originalStop.avgLongitude
    )
    let stationIdSuffix = stableStationIdentifier(
        for: platforms,
        fallbackName: stationName
    )

    return ApiStop(
        id: "\(originalStop.id):\(kind):\(stationIdSuffix)",
        name: stationName,
        avgLatitude: fallbackCoordinate.latitude,
        avgLongitude: fallbackCoordinate.longitude,
        entrances: useStopEntrances ? originalStop.entrances : [],
        platforms: platforms
    )
}

private func stationGroupKey(for platform: ApiPlatform) -> String {
    let normalizedName = normalizedStationName(platform.name)

    if !normalizedName.isEmpty {
        return normalizedName
    }

    return platform.id
}

private func resolvedStationName(
    for platforms: [ApiPlatform],
    fallbackName: String
) -> String {
    if let platformName = platforms
        .map(\.name)
        .first(where: { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty })
    {
        return platformName
    }

    return fallbackName
}

private func filteredPlatform(
    _ platform: ApiPlatform,
    allowedModes: Set<RailStopTransportMode>
) -> ApiPlatform? {
    guard !isMetroPlatform(platform) else {
        return nil
    }

    let filteredRoutes = platform.routes.filter { route in
        guard let mode = mapTransportMode(for: route) else {
            return false
        }

        return allowedModes.contains(mode)
    }

    guard !filteredRoutes.isEmpty else {
        return nil
    }

    return ApiPlatform(
        id: platform.id,
        latitude: platform.latitude,
        longitude: platform.longitude,
        name: platform.name,
        code: platform.code,
        direction: platform.direction,
        isMetro: false,
        routes: filteredRoutes
    )
}

private func stableStationIdentifier(
    for platforms: [ApiPlatform],
    fallbackName: String
) -> String {
    normalizedStationName(
        resolvedStationName(
            for: platforms,
            fallbackName: fallbackName
        )
    )
}

private func normalizedStationName(_ name: String) -> String {
    name
        .folding(
            options: [.diacriticInsensitive, .caseInsensitive],
            locale: .current
        )
        .trimmingCharacters(in: .whitespacesAndNewlines)
}

private func comparePlatforms(_ lhs: ApiPlatform, _ rhs: ApiPlatform) -> Bool {
    let leftCode = lhs.code ?? ""
    let rightCode = rhs.code ?? ""

    if leftCode != rightCode {
        return leftCode.localizedCompare(rightCode) == .orderedAscending
    }

    return lhs.id < rhs.id
}

private func coordinateCentroid(
    for coordinates: [CLLocationCoordinate2D]
) -> CLLocationCoordinate2D? {
    guard !coordinates.isEmpty else {
        return nil
    }

    let count = Double(coordinates.count)

    return CLLocationCoordinate2D(
        latitude: coordinates.map(\.latitude).reduce(0, +) / count,
        longitude: coordinates.map(\.longitude).reduce(0, +) / count
    )
}

private func coordinateDistanceSquared(
    _ lhs: CLLocationCoordinate2D,
    to rhs: CLLocationCoordinate2D
) -> Double {
    let latitudeDelta = lhs.latitude - rhs.latitude
    let longitudeDelta = lhs.longitude - rhs.longitude

    return latitudeDelta * latitudeDelta + longitudeDelta * longitudeDelta
}
