// metro-now
// https://github.com/krystxf/metro-now

import Foundation

func findRoutePreviewDirection(
    in data: ApiRouteDetail,
    headsign: String?,
    currentPlatformId: String?,
    currentPlatformName: String?
) -> ApiRouteDirection? {
    if let headsign {
        let normalizedHeadsign = headsign.trimmingCharacters(in: .whitespacesAndNewlines)

        if let matchingHeadsignDirection = data.directions.first(where: { direction in
            direction.platforms.last?.name == normalizedHeadsign
        }) {
            return matchingHeadsignDirection
        }
    }

    if let matchingPlatformDirection = data.directions.first(where: { direction in
        direction.platforms.contains(where: { platform in
            if let currentPlatformId, platform.id == currentPlatformId {
                return true
            }

            guard let currentPlatformName else {
                return false
            }

            return platform.name == currentPlatformName
        })
    }) {
        return matchingPlatformDirection
    }

    return data.directions.first
}

func buildRoutePreviewPlatformItems(
    for direction: ApiRouteDirection,
    currentPlatformId: String?,
    currentPlatformName: String?
) -> [RoutePreviewPlatformItem] {
    let currentPlatformIndex = direction.platforms.firstIndex(where: { platform in
        if let currentPlatformId, platform.id == currentPlatformId {
            return true
        }

        guard let currentPlatformName else {
            return false
        }

        return platform.name == currentPlatformName
    })

    return direction.platforms.enumerated().map { index, platform in
        let state: RoutePreviewPlatformState = if let currentPlatformIndex {
            if index < currentPlatformIndex {
                .passed
            } else if index == currentPlatformIndex {
                .current
            } else {
                .upcoming
            }
        } else {
            .upcoming
        }

        return RoutePreviewPlatformItem(
            platform: platform,
            state: state
        )
    }
}

func findCurrentRoutePreviewPlatform(
    in direction: ApiRouteDirection,
    currentPlatformId: String?,
    currentPlatformName: String?
) -> ApiRoutePlatform? {
    direction.platforms.first { platform in
        if let currentPlatformId, platform.id == currentPlatformId {
            return true
        }

        guard let currentPlatformName else {
            return false
        }

        return platform.name == currentPlatformName
    }
}
