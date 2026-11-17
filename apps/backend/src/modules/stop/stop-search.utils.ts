import {
    type SearchableStopTerm,
    type StopSearchMatchScore,
    compareStopSearchMatchQuality,
    compareStopSearchMatchScores,
    getStopSearchMatchScoreForValue,
    normalizeStopSearchValue,
    squaredGeoDistance,
    tokenizeStopSearchValue,
} from "src/modules/stop/stop-search-string.utils";
import type { StopRecordBase } from "src/modules/stop/stop.types";

export * from "src/modules/stop/stop-search-string.utils";

export type SearchableStopRow = StopRecordBase & {
    hasMetro: boolean;
    normalizedStopName: string;
    searchTerms: SearchableStopTerm[];
};

export const getStopSearchMatchScore = ({
    normalizedQuery,
    searchableStop,
}: {
    normalizedQuery: string;
    searchableStop: SearchableStopRow;
}): StopSearchMatchScore | null => {
    let bestScore: StopSearchMatchScore | null = null;

    for (const term of searchableStop.searchTerms) {
        const candidateValues = [
            term.normalizedValue,
            ...term.normalizedTokens,
        ];

        for (const candidateValue of candidateValues) {
            const score = getStopSearchMatchScoreForValue({
                normalizedCandidate: candidateValue,
                normalizedQuery,
                sourceRank: term.sourceRank,
            });

            if (!score) {
                continue;
            }

            if (
                bestScore === null ||
                compareStopSearchMatchScores(score, bestScore) < 0
            ) {
                bestScore = score;
            }
        }
    }

    return bestScore;
};

export const createSearchableStopTerm = ({
    sourceRank,
    value,
}: {
    sourceRank: number;
    value: string;
}): SearchableStopTerm => ({
    normalizedTokens: tokenizeStopSearchValue(value),
    normalizedValue: normalizeStopSearchValue(value),
    sourceRank,
});

export type SearchablePlatformRow = {
    isMetro: boolean;
    name: string;
    stopId: string | null;
};

export const buildSearchableStops = (
    stops: StopRecordBase[],
    platformRows: SearchablePlatformRow[],
): SearchableStopRow[] => {
    const platformNamesByStopId = new Map<string, Set<string>>();
    const stopIdsWithMetroPlatforms = new Set<string>();

    for (const row of platformRows) {
        if (!row.stopId) {
            continue;
        }

        const platformNames =
            platformNamesByStopId.get(row.stopId) ?? new Set();

        platformNames.add(row.name);
        platformNamesByStopId.set(row.stopId, platformNames);

        if (row.isMetro) {
            stopIdsWithMetroPlatforms.add(row.stopId);
        }
    }

    return stops.map((stop) => ({
        ...stop,
        hasMetro: stopIdsWithMetroPlatforms.has(stop.id),
        normalizedStopName: normalizeStopSearchValue(stop.name),
        searchTerms: [
            createSearchableStopTerm({
                sourceRank: 0,
                value: stop.name,
            }),
            ...Array.from(platformNamesByStopId.get(stop.id) ?? [])
                .sort((left, right) => left.localeCompare(right))
                .map((platformName) =>
                    createSearchableStopTerm({
                        sourceRank: 1,
                        value: platformName,
                    }),
                ),
        ],
    }));
};

export type StopSearchResult = {
    score: StopSearchMatchScore;
    stop: SearchableStopRow;
};

export const compareStopSearchResults = (
    left: StopSearchResult,
    right: StopSearchResult,
    origin?: { latitude: number; longitude: number },
): number => {
    const matchQualityOrder = compareStopSearchMatchQuality(
        left.score,
        right.score,
    );

    if (matchQualityOrder !== 0) {
        return matchQualityOrder;
    }

    if (left.stop.hasMetro !== right.stop.hasMetro) {
        return left.stop.hasMetro ? -1 : 1;
    }

    const scoreOrder = compareStopSearchMatchScores(left.score, right.score);

    if (scoreOrder !== 0) {
        return scoreOrder;
    }

    const nameOrder = left.stop.normalizedStopName.localeCompare(
        right.stop.normalizedStopName,
    );

    if (nameOrder !== 0) {
        return nameOrder;
    }

    if (origin) {
        const leftDistance = squaredGeoDistance(
            left.stop.avgLatitude,
            left.stop.avgLongitude,
            origin.latitude,
            origin.longitude,
        );
        const rightDistance = squaredGeoDistance(
            right.stop.avgLatitude,
            right.stop.avgLongitude,
            origin.latitude,
            origin.longitude,
        );

        if (leftDistance !== rightDistance) {
            return leftDistance - rightDistance;
        }
    }

    return left.stop.id.localeCompare(right.stop.id);
};
